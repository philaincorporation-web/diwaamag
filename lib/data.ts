// Couche d'accès aux données publiques.
// Chaque lecture est mise en cache ('use cache') et étiquetée (cacheTag) : les pages publiques sont
// pré-rendues et servies instantanément, puis régénérées à la demande quand le back-office publie
// ou modifie un contenu (équivalent ISR avec Cache Components — cf. section 7.1).
// Toutes les lectures prennent la langue en paramètre : la version anglaise est servie quand elle existe,
// sinon le contenu original (français) est renvoyé avec l'indicateur `traduit: false`.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { TiptapDoc } from "@/lib/content";
import type { Langue } from "@/lib/i18n";

export const TAGS = {
  articles: "articles",
  article: (slug: string) => `article:${slug}`,
  rubriques: "rubriques",
  motsCles: "mots-cles",
  numeros: "numeros",
  commentaires: (articleId: string) => `commentaires:${articleId}`,
  parametres: "parametres",
} as const;

const PUBLIE = { statut: "PUBLIE" } satisfies Prisma.ArticleWhereInput;
const tri = [{ datePublication: "desc" as const }, { creeLe: "desc" as const }];

function selection(lang: Langue) {
  return {
    id: true,
    titre: true,
    slug: true,
    chapeau: true,
    imageUneUrl: true,
    imageUneAlt: true,
    type: true,
    datePublication: true,
    dateMiseAJour: true,
    tempsLecture: true,
    vues: true,
    rubrique: { select: { nom: true, nomEn: true, slug: true, couleur: true } },
    auteur: { select: { id: true, nom: true } },
    traductions: { where: { langue: lang }, select: { titre: true, chapeau: true } },
  } satisfies Prisma.ArticleSelect;
}

type Brut = Prisma.ArticleGetPayload<{ select: ReturnType<typeof selection> }>;

function rubriqueLocale(r: { nom: string; nomEn: string | null; slug: string; couleur: string | null }, lang: Langue) {
  return { nom: lang === "en" && r.nomEn ? r.nomEn : r.nom, slug: r.slug, couleur: r.couleur };
}

function localiser(a: Brut, lang: Langue) {
  const t = lang === "fr" ? null : a.traductions[0];
  const { traductions, rubrique, ...reste } = a;
  void traductions;
  return {
    ...reste,
    titre: t?.titre ?? a.titre,
    chapeau: t?.chapeau ?? a.chapeau,
    rubrique: rubriqueLocale(rubrique, lang),
    traduit: lang === "fr" || Boolean(t),
  };
}

export type CarteArticle = ReturnType<typeof localiser>;

async function cartes(lang: Langue, args: Omit<Prisma.ArticleFindManyArgs, "select">) {
  const liste = await prisma.article.findMany({ ...args, select: selection(lang) });
  return liste.map((a) => localiser(a, lang));
}

export async function getRubriques(lang: Langue) {
  "use cache";
  cacheTag(TAGS.rubriques);
  cacheLife("days");
  const rubriques = await prisma.rubrique.findMany({ orderBy: [{ famille: "asc" }, { ordre: "asc" }] });
  return rubriques.map((r) => ({
    ...rubriqueLocale(r, lang),
    id: r.id,
    famille: r.famille,
    description: lang === "en" && r.descriptionEn ? r.descriptionEn : r.description,
  }));
}

export async function getRubrique(slug: string, lang: Langue) {
  "use cache";
  cacheTag(TAGS.rubriques);
  cacheLife("days");
  const r = await prisma.rubrique.findUnique({ where: { slug } });
  if (!r) return null;
  return { ...rubriqueLocale(r, lang), famille: r.famille, description: lang === "en" && r.descriptionEn ? r.descriptionEn : r.description };
}

/** Articles du carrousel « À la une » (ordreUne), complétés par les plus récents si besoin. */
export async function getUne(lang: Langue, limite = 5): Promise<CarteArticle[]> {
  "use cache";
  cacheTag(TAGS.articles);
  cacheLife("hours");
  const une = await cartes(lang, { where: { ...PUBLIE, aLaUne: true }, orderBy: [{ ordreUne: "asc" }, ...tri], take: limite });
  if (une.length >= limite) return une;
  const complement = await cartes(lang, { where: { ...PUBLIE, id: { notIn: une.map((a) => a.id) } }, orderBy: tri, take: limite - une.length });
  return [...une, ...complement];
}

export async function getDernieres(lang: Langue, limite = 8, exclure: string[] = []) {
  "use cache";
  cacheTag(TAGS.articles);
  cacheLife("hours");
  return cartes(lang, { where: { ...PUBLIE, id: { notIn: exclure } }, orderBy: tri, take: limite });
}

export async function getPlusLus(lang: Langue, limite = 5) {
  "use cache";
  cacheTag(TAGS.articles);
  cacheLife("hours");
  return cartes(lang, { where: PUBLIE, orderBy: [{ vues: "desc" }, ...tri], take: limite });
}

export async function getArticlesRubrique(slug: string, lang: Langue, page = 1, parPage = 12) {
  "use cache";
  cacheTag(TAGS.articles, TAGS.rubriques);
  cacheLife("hours");
  const where = { ...PUBLIE, rubrique: { slug } } satisfies Prisma.ArticleWhereInput;
  const [articles, total] = await Promise.all([
    cartes(lang, { where, orderBy: tri, take: parPage, skip: (page - 1) * parPage }),
    prisma.article.count({ where }),
  ]);
  return { articles, total, pages: Math.max(1, Math.ceil(total / parPage)) };
}

export async function getArticle(slug: string, lang: Langue) {
  "use cache";
  cacheTag(TAGS.articles, TAGS.article(slug));
  cacheLife("hours");
  const a = await prisma.article.findFirst({
    where: { ...PUBLIE, slug },
    include: {
      rubrique: true,
      auteur: { select: { id: true, nom: true, bio: true, avatarUrl: true } },
      motsCles: { include: { motCle: true } },
      traductions: { where: { langue: lang } },
    },
  });
  if (!a) return null;
  const t = lang === "fr" ? null : a.traductions[0];
  const { traductions, ...reste } = a;
  void traductions;
  return {
    ...reste,
    titre: t?.titre ?? a.titre,
    chapeau: t?.chapeau ?? a.chapeau,
    contenu: (t?.contenu ?? a.contenu) as unknown as TiptapDoc,
    metaTitre: t ? null : a.metaTitre,
    metaDescription: t ? t.chapeau.slice(0, 160) : a.metaDescription,
    rubrique: { ...a.rubrique, ...rubriqueLocale(a.rubrique, lang) },
    traduit: lang === "fr" || Boolean(t),
    traductionAuto: Boolean(t?.automatique),
  };
}

export async function getArticlesLies(articleId: string, rubriqueId: string, motCleIds: string[], lang: Langue, limite = 4) {
  "use cache";
  cacheTag(TAGS.articles);
  cacheLife("hours");
  const lies = await cartes(lang, {
    where: { ...PUBLIE, id: { not: articleId }, OR: [{ rubriqueId }, { motsCles: { some: { motCleId: { in: motCleIds } } } }] },
    orderBy: tri,
    take: limite,
  });
  if (lies.length >= limite) return lies;
  const complement = await cartes(lang, {
    where: { ...PUBLIE, id: { notIn: [articleId, ...lies.map((a) => a.id)] } },
    orderBy: tri,
    take: limite - lies.length,
  });
  return [...lies, ...complement];
}

export async function getMotCle(slug: string, lang: Langue) {
  "use cache";
  cacheTag(TAGS.articles, TAGS.motsCles);
  cacheLife("hours");
  const motCle = await prisma.motCle.findUnique({ where: { slug } });
  if (!motCle) return null;
  const articles = await cartes(lang, { where: { ...PUBLIE, motsCles: { some: { motCleId: motCle.id } } }, orderBy: tri });
  return { motCle, articles };
}

export async function getMotsClesPopulaires(limite = 18) {
  "use cache";
  cacheTag(TAGS.articles, TAGS.motsCles);
  cacheLife("hours");
  const mots = await prisma.motCle.findMany({
    include: { _count: { select: { articles: { where: { article: PUBLIE } } } } },
  });
  return mots
    .filter((m) => m._count.articles > 0)
    .sort((a, b) => b._count.articles - a._count.articles)
    .slice(0, limite);
}

export async function getVideos(lang: Langue, limite = 12) {
  "use cache";
  cacheTag(TAGS.articles);
  cacheLife("hours");
  return cartes(lang, { where: { ...PUBLIE, type: "VIDEO" }, orderBy: tri, take: limite });
}

export async function getAuteur(id: string, lang: Langue) {
  "use cache";
  cacheTag(TAGS.articles);
  cacheLife("hours");
  const auteur = await prisma.admin.findUnique({ where: { id }, select: { id: true, nom: true, bio: true, avatarUrl: true } });
  if (!auteur) return null;
  const articles = await cartes(lang, { where: { ...PUBLIE, auteurId: id }, orderBy: tri });
  return { auteur, articles };
}

function numeroLocal<T extends { titre: string; titreEn: string | null; edito: string | null; editoEn: string | null }>(n: T, lang: Langue) {
  return { ...n, titre: lang === "en" && n.titreEn ? n.titreEn : n.titre, edito: lang === "en" && n.editoEn ? n.editoEn : n.edito };
}

export async function getNumeros(lang: Langue) {
  "use cache";
  cacheTag(TAGS.numeros);
  cacheLife("days");
  const numeros = await prisma.numero.findMany({
    where: { publie: true },
    orderBy: { mois: "desc" },
    include: { _count: { select: { articles: true } } },
  });
  return numeros.map((n) => numeroLocal(n, lang));
}

export async function getNumero(slug: string, lang: Langue) {
  "use cache";
  cacheTag(TAGS.numeros, TAGS.articles);
  cacheLife("days");
  const n = await prisma.numero.findFirst({
    where: { slug, publie: true },
    include: { articles: { where: { article: PUBLIE }, orderBy: { ordre: "asc" }, include: { article: { select: selection(lang) } } } },
  });
  if (!n) return null;
  return { ...numeroLocal(n, lang), articles: n.articles.map((x) => localiser(x.article, lang)) };
}

export async function getCommentaires(articleId: string) {
  "use cache";
  cacheTag(TAGS.commentaires(articleId));
  cacheLife("hours");
  // L'adresse e-mail n'est jamais sélectionnée : elle ne doit pas sortir du back-office.
  return prisma.commentaire.findMany({
    where: { articleId, statut: "APPROUVE", parentId: null },
    orderBy: { creeLe: "asc" },
    select: {
      id: true,
      nom: true,
      message: true,
      lien: true,
      creeLe: true,
      reponses: {
        where: { statut: "APPROUVE" },
        orderBy: { creeLe: "asc" },
        select: { id: true, nom: true, message: true, lien: true, creeLe: true },
      },
    },
  });
}

export async function rechercher(q: string, lang: Langue, limite = 30) {
  "use cache";
  cacheTag(TAGS.articles);
  cacheLife("minutes");
  const terme = q.trim();
  if (terme.length < 2) return [];
  const contient = { contains: terme, mode: "insensitive" as const };
  return cartes(lang, {
    where: {
      ...PUBLIE,
      OR: [
        { titre: contient },
        { chapeau: contient },
        { traductions: { some: { OR: [{ titre: contient }, { chapeau: contient }] } } },
        { motsCles: { some: { motCle: { nom: contient } } } },
        { rubrique: { OR: [{ nom: contient }, { nomEn: contient }] } },
      ],
    },
    orderBy: tri,
    take: limite,
  });
}

/** Utilisé par le plan du site, le flux RSS et generateStaticParams. */
export async function getIndexPublic() {
  "use cache";
  cacheTag(TAGS.articles, TAGS.rubriques, TAGS.numeros, TAGS.motsCles);
  cacheLife("hours");
  const [articles, rubriques, numeros, motsCles, auteurs] = await Promise.all([
    cartes("fr", { where: PUBLIE, orderBy: tri }),
    prisma.rubrique.findMany({ select: { slug: true } }),
    prisma.numero.findMany({ where: { publie: true }, select: { slug: true, mois: true } }),
    prisma.motCle.findMany({ select: { slug: true } }),
    prisma.admin.findMany({ where: { articles: { some: PUBLIE } }, select: { id: true } }),
  ]);
  return { articles, rubriques, numeros, motsCles, auteurs };
}
