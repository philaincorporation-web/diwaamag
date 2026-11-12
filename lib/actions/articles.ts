"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { OPTIONS_TRANSACTION, prisma } from "@/lib/db";
import { lierMotsCles } from "@/lib/mots-cles";
import { TAGS } from "@/lib/data";
import { exigerAdmin, exigerSuperAdmin, journaliser } from "@/lib/admin";
import { slugify, tempsDeLecture, type TiptapDoc } from "@/lib/content";
import { notifierNouvelArticle } from "@/lib/services";
import { traductionAutoDisponible, traduireArticle } from "@/lib/traduction";
import type { Prisma, StatutArticle } from "@/lib/generated/prisma/client";

export type EtatArticle = { ok: boolean; message: string; erreurs?: Record<string, string> } | null;

const schema = z.object({
  id: z.string().optional().transform((v) => v || undefined),
  titre: z.string().trim().min(5, "Le titre doit comporter au moins 5 caractères.").max(200),
  slug: z.string().trim().max(120).optional(),
  chapeau: z.string().trim().max(600, "Le chapeau est trop long (600 caractères maximum).").default(""),
  contenu: z.string().min(2),
  rubriqueId: z.string().min(1, "Choisissez une rubrique."),
  type: z.enum(["ACTUALITE", "INTERVIEW", "DOSSIER", "VIDEO"]),
  motsCles: z.string().default(""),
  imageUneUrl: z.string().trim().max(1000).optional().transform((v) => v || null),
  imageUneAlt: z.string().trim().max(300).optional().transform((v) => v || null),
  videoUrl: z.string().trim().max(1000).optional().transform((v) => v || null),
  aLaUne: z.string().optional().transform((v) => v === "on"),
  metaTitre: z.string().trim().max(70, "Titre SEO : 70 caractères maximum.").optional().transform((v) => v || null),
  metaDescription: z.string().trim().max(160, "Description SEO : 160 caractères maximum.").optional().transform((v) => v || null),
  dateProgrammee: z.string().optional().transform((v) => (v ? new Date(v) : null)),
  intention: z.enum(["brouillon", "publier", "programmer", "enregistrer"]),
});

function verifierPublication(d: z.infer<typeof schema>, doc: TiptapDoc) {
  const erreurs: Record<string, string> = {};
  if (!d.chapeau || d.chapeau.length < 20) erreurs.chapeau = "Un chapeau d'au moins 20 caractères est requis pour publier.";
  if (!d.imageUneUrl) erreurs.imageUneUrl = "Une image de Une est requise pour publier.";
  if (!d.imageUneAlt) erreurs.imageUneAlt = "Le texte alternatif de l'image est obligatoire.";
  if (tempsDeLecture(doc) < 1 || (doc.content?.length ?? 0) === 0) erreurs.contenu = "Le contenu est vide.";
  if (d.type === "VIDEO" && !d.videoUrl) erreurs.videoUrl = "Une vidéo doit avoir une URL de vidéo.";
  return erreurs;
}

async function slugUnique(base: string, idExclu?: string) {
  let slug = base || "article";
  for (let i = 2; ; i++) {
    const existe = await prisma.article.findFirst({ where: { slug, NOT: idExclu ? { id: idExclu } : undefined }, select: { id: true } });
    if (!existe) return slug;
    slug = `${base}-${i}`;
  }
}

function invalider(...slugs: (string | undefined)[]) {
  updateTag(TAGS.articles);
  updateTag(TAGS.motsCles);
  for (const s of slugs) if (s) updateTag(TAGS.article(s));
}

export async function enregistrerArticle(_: EtatArticle, formData: FormData): Promise<EtatArticle> {
  const admin = await exigerAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const erreurs: Record<string, string> = {};
    for (const i of parsed.error.issues) erreurs[String(i.path[0])] = i.message;
    return { ok: false, message: "Merci de corriger les champs indiqués.", erreurs };
  }
  const d = parsed.data;
  let doc: TiptapDoc;
  try {
    doc = JSON.parse(d.contenu) as TiptapDoc;
  } catch {
    return { ok: false, message: "Le contenu de l'éditeur est illisible.", erreurs: { contenu: "Contenu invalide." } };
  }

  const existant = d.id ? await prisma.article.findUnique({ where: { id: d.id } }) : null;
  if (d.id && !existant) return { ok: false, message: "Article introuvable." };
  if (existant?.statut === "CORBEILLE") return { ok: false, message: "Restaurez l'article avant de le modifier." };

  // Statut cible selon l'intention.
  let statut: StatutArticle = existant?.statut ?? "BROUILLON";
  if (d.intention === "brouillon") statut = existant?.statut === "PUBLIE" ? "PUBLIE" : "BROUILLON";
  if (d.intention === "publier") statut = "PUBLIE";
  if (d.intention === "programmer") statut = "PROGRAMME";

  if (statut === "PUBLIE" || statut === "PROGRAMME") {
    const erreurs = verifierPublication(d, doc);
    if (statut === "PROGRAMME") {
      if (!d.dateProgrammee || Number.isNaN(d.dateProgrammee.getTime())) erreurs.dateProgrammee = "Indiquez la date de publication.";
      else if (d.dateProgrammee.getTime() < Date.now()) erreurs.dateProgrammee = "La date programmée doit être dans le futur.";
    }
    if (Object.keys(erreurs).length) return { ok: false, message: "L'article ne remplit pas les conditions de publication.", erreurs };
  }

  const slug = await slugUnique(slugify(d.slug || d.titre), existant?.id);
  const maintenant = new Date();
  const premierePublication = statut === "PUBLIE" && existant?.statut !== "PUBLIE";

  const donnees = {
    titre: d.titre,
    slug,
    chapeau: d.chapeau,
    contenu: doc as unknown as Prisma.InputJsonValue,
    type: d.type,
    statut,
    imageUneUrl: d.imageUneUrl,
    imageUneAlt: d.imageUneAlt,
    videoUrl: d.videoUrl,
    aLaUne: d.aLaUne,
    metaTitre: d.metaTitre,
    metaDescription: d.metaDescription,
    tempsLecture: tempsDeLecture(doc),
    dateProgrammee: statut === "PROGRAMME" ? d.dateProgrammee : null,
    datePublication: premierePublication ? (existant?.datePublication ?? maintenant) : existant?.datePublication ?? null,
    dateMiseAJour: statut === "PUBLIE" ? maintenant : existant?.dateMiseAJour ?? null,
    rubrique: { connect: { id: d.rubriqueId } },
  } satisfies Prisma.ArticleUpdateInput;

  const nomsMotsCles = [...new Set(d.motsCles.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 15);

  const article = await prisma.$transaction(async (tx) => {
    const a = existant
      ? await tx.article.update({ where: { id: existant.id }, data: donnees })
      : await tx.article.create({ data: { ...donnees, auteur: { connect: { id: admin.id } } } });
    if (d.aLaUne && !existant?.aLaUne) {
      const max = await tx.article.aggregate({ _max: { ordreUne: true }, where: { aLaUne: true } });
      await tx.article.update({ where: { id: a.id }, data: { ordreUne: (max._max.ordreUne ?? 0) + 1 } });
    }
    await lierMotsCles(tx, a.id, nomsMotsCles);
    // Chaque enregistrement crée une version (règle de gestion 8.1).
    await tx.articleVersion.create({ data: { articleId: a.id, titre: a.titre, contenu: a.contenu as Prisma.InputJsonValue, modifieParId: admin.id } });
    return a;
  }, OPTIONS_TRANSACTION);

  const action = !existant ? "CREATION" : premierePublication ? "PUBLICATION" : statut === "PROGRAMME" ? "PROGRAMMATION" : "MODIFICATION";
  await journaliser(admin.id, action, "Article", article.id, { titre: article.titre, statut });

  if (statut === "PUBLIE" || existant?.statut === "PUBLIE") invalider(article.slug, existant?.slug);
  if (premierePublication) {
    await notifierNouvelArticle(article);
    await traductionAutomatiqueInitiale(article.id, article.slug);
  }

  if (!existant) redirect(`/admin/articles/${article.id}?cree=1`);
  const messages: Record<string, string> = {
    publier: premierePublication ? "Article publié !" : "Article mis à jour en ligne.",
    programmer: "Publication programmée.",
    brouillon: statut === "PUBLIE" ? "Modifications publiées." : "Brouillon enregistré.",
    enregistrer: "Enregistré.",
  };
  return { ok: true, message: messages[d.intention] };
}

/** À la première publication, crée une version anglaise automatique (DeepL) si aucune n'existe. */
async function traductionAutomatiqueInitiale(articleId: string, slug: string) {
  if (!traductionAutoDisponible()) return;
  const existe = await prisma.articleTraduction.count({ where: { articleId, langue: "en" } });
  if (existe) return;
  const a = await prisma.article.findUnique({ where: { id: articleId }, select: { titre: true, chapeau: true, contenu: true } });
  if (!a) return;
  try {
    const t = await traduireArticle({ titre: a.titre, chapeau: a.chapeau, contenu: a.contenu as unknown as TiptapDoc });
    await prisma.articleTraduction.create({
      data: { articleId, langue: "en", titre: t.titre, chapeau: t.chapeau, contenu: t.contenu as unknown as Prisma.InputJsonValue, automatique: true },
    });
    updateTag(TAGS.article(slug));
  } catch (e) {
    console.error("Traduction automatique impossible :", e);
  }
}

export async function changerStatut(id: string, statut: "ARCHIVE" | "CORBEILLE" | "BROUILLON" | "PUBLIE") {
  const admin = await exigerAdmin();
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a) return { ok: false, message: "Article introuvable." };
  if (statut === "PUBLIE" && (!a.imageUneUrl || !a.imageUneAlt || a.chapeau.length < 20)) {
    return { ok: false, message: "Impossible de republier : image de Une, texte alternatif et chapeau requis." };
  }
  await prisma.article.update({
    where: { id },
    data: {
      statut,
      aLaUne: statut === "PUBLIE" ? a.aLaUne : false,
      datePublication: statut === "PUBLIE" ? (a.datePublication ?? new Date()) : a.datePublication,
    },
  });
  await journaliser(admin.id, `STATUT_${statut}`, "Article", id, { titre: a.titre, avant: a.statut });
  invalider(a.slug);
  return { ok: true, message: "Statut mis à jour." };
}

export async function supprimerDefinitivement(id: string) {
  const admin = await exigerSuperAdmin();
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a || a.statut !== "CORBEILLE") return { ok: false, message: "Seul un article en corbeille peut être supprimé définitivement." };
  await prisma.article.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION_DEFINITIVE", "Article", id, { titre: a.titre });
  invalider(a.slug);
  return { ok: true, message: "Article supprimé définitivement." };
}

export async function viderCorbeille() {
  const admin = await exigerSuperAdmin();
  const { count } = await prisma.article.deleteMany({ where: { statut: "CORBEILLE" } });
  await journaliser(admin.id, "VIDAGE_CORBEILLE", "Article", null, { supprimes: count });
  updateTag(TAGS.articles);
  return { ok: true, message: `${count} article(s) supprimé(s) définitivement.` };
}

export async function restaurerVersion(versionId: string) {
  const admin = await exigerAdmin();
  const v = await prisma.articleVersion.findUnique({ where: { id: versionId }, include: { article: true } });
  if (!v) return { ok: false, message: "Version introuvable." };
  await prisma.$transaction([
    prisma.article.update({
      where: { id: v.articleId },
      data: {
        titre: v.titre,
        contenu: v.contenu as Prisma.InputJsonValue,
        tempsLecture: tempsDeLecture(v.contenu as unknown as TiptapDoc),
        dateMiseAJour: v.article.statut === "PUBLIE" ? new Date() : v.article.dateMiseAJour,
      },
    }),
    prisma.articleVersion.create({ data: { articleId: v.articleId, titre: v.titre, contenu: v.contenu as Prisma.InputJsonValue, modifieParId: admin.id } }),
  ]);
  await journaliser(admin.id, "RESTAURATION_VERSION", "Article", v.articleId, { version: versionId });
  if (v.article.statut === "PUBLIE") invalider(v.article.slug);
  redirect(`/admin/articles/${v.articleId}?restaure=${versionId}`);
}

/** Met à jour l'ordre du carrousel « À la une » (liste d'identifiants ordonnée). */
export async function enregistrerUne(ids: string[]) {
  const admin = await exigerAdmin();
  await prisma.$transaction([
    prisma.article.updateMany({ where: { aLaUne: true, id: { notIn: ids } }, data: { aLaUne: false, ordreUne: null } }),
    ...ids.map((id, i) => prisma.article.update({ where: { id }, data: { aLaUne: true, ordreUne: i + 1 } })),
  ]);
  await journaliser(admin.id, "MODIFICATION_UNE", "Une", null, { ids });
  updateTag(TAGS.articles);
  return { ok: true, message: "La Une est à jour." };
}
