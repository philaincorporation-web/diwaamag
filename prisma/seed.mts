// Données initiales du Magazine DIWAA (section 8.1 du document d'architecture) :
//  - un compte SUPER_ADMIN (identifiants lus dans les variables d'environnement SEED_ADMIN_*) ;
//  - les rubriques géographiques et thématiques ;
//  - les articles du DIWA MAG de décembre 2025 (prisma/data/*.md) et le numéro mensuel correspondant.
// Le script est idempotent : il peut être relancé sans créer de doublons.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma, type TypeContenu } from "../lib/generated/prisma/client.ts";
import { markdownVersTiptap, slugify, tempsDeLecture } from "../lib/content.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL!, max: 1 }),
});

const RUBRIQUES = [
  { nom: "Gabon", slug: "gabon", famille: "GEOGRAPHIQUE", couleur: "#2E7D32", description: "L'actualité du numérique au Gabon.", nomEn: "Gabon", descriptionEn: "Digital news from Gabon." },
  { nom: "Afrique", slug: "afrique", famille: "GEOGRAPHIQUE", couleur: "#B45309", description: "Innovation et transformation digitale sur le continent.", nomEn: "Africa", descriptionEn: "Innovation and digital transformation across the continent." },
  { nom: "Monde", slug: "monde", famille: "GEOGRAPHIQUE", couleur: "#1D4ED8", description: "Les tendances technologiques internationales.", nomEn: "World", descriptionEn: "International technology trends." },
  { nom: "Femmes du numérique", slug: "femmes-du-numerique", famille: "THEMATIQUE", couleur: "#BE185D", description: "Celles qui font le numérique africain.", nomEn: "Women in tech", descriptionEn: "The women shaping African tech." },
  { nom: "Startups et innovation", slug: "startups-et-innovation", famille: "THEMATIQUE", couleur: "#7C3AED", description: "Jeunes pousses, incubateurs et écosystèmes.", nomEn: "Startups & innovation", descriptionEn: "Start-ups, incubators and ecosystems." },
  { nom: "Cybersécurité et IA", slug: "cybersecurite-et-ia", famille: "THEMATIQUE", couleur: "#0F766E", description: "Intelligence artificielle, données et sécurité numérique.", nomEn: "Cybersecurity & AI", descriptionEn: "Artificial intelligence, data and digital security." },
  { nom: "Portraits des lauréates", slug: "portraits-des-laureates", famille: "THEMATIQUE", couleur: "#CDA40E", description: "Les lauréates des DigieWomen Awards.", nomEn: "Award winners", descriptionEn: "The winners of the DigieWomen Awards." },
  { nom: "Événements et agenda", slug: "evenements-et-agenda", famille: "THEMATIQUE", couleur: "#9A3412", description: "Rendez-vous, cérémonies et événements DIWAA.", nomEn: "Events", descriptionEn: "Meetings, ceremonies and DIWAA events." },
] as const;

type ArticleSource = {
  slug: string;
  titre: string;
  rubrique: string;
  type: TypeContenu;
  auteur: string;
  chapeau: string;
  motscles: string[];
  une?: number;
  corps: string;
};

function lireArticles(fichier = "articles-diwa-mag-decembre-2025.md"): ArticleSource[] {
  const brut = readFileSync(new URL(`./data/${fichier}`, import.meta.url), "utf8");
  return brut
    .split(/^=== /m)
    .filter((b) => b.trim())
    .map((bloc) => {
      const [entete, ...reste] = bloc.split(/^---$/m);
      const champs: Record<string, string> = {};
      for (const ligne of entete.split("\n")) {
        const m = ligne.match(/^(\w+): (.*)$/);
        if (m) champs[m[1]] = m[2].trim();
      }
      return {
        slug: champs.slug,
        titre: champs.titre,
        rubrique: champs.rubrique,
        type: champs.type as TypeContenu,
        auteur: champs.auteur,
        chapeau: champs.chapeau,
        motscles: (champs.motscles ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        une: champs.une ? Number(champs.une) : undefined,
        corps: reste.join("---").trim(),
      };
    });
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const motDePasse = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !motDePasse) throw new Error("SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD sont requis.");

  const superAdmin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      nom: process.env.SEED_ADMIN_NOM || "Super Administrateur",
      email,
      motDePasse: await bcrypt.hash(motDePasse, 12),
      role: "SUPER_ADMIN",
    },
  });

  // Signature éditoriale collective : compte désactivé (aucune connexion possible).
  const redaction = await prisma.admin.upsert({
    where: { email: "redaction@diwaamag.com" },
    update: {},
    create: {
      nom: "Rédaction DIWA MAG",
      email: "redaction@diwaamag.com",
      motDePasse: await bcrypt.hash(randomBytes(24).toString("hex"), 12),
      role: "ADMIN",
      actif: false,
      bio: "La rédaction du magazine des DigieWomen Awards Africa : l'actualité du numérique au Gabon, en Afrique et dans le monde.",
    },
  });

  const rubriques = new Map<string, string>();
  for (const [ordre, r] of RUBRIQUES.entries()) {
    const rub = await prisma.rubrique.upsert({
      where: { slug: r.slug },
      update: {},
      create: { ...r, ordre },
    });
    // Version anglaise ajoutée aux bases déjà initialisées, sans écraser une saisie du back-office.
    if (!rub.nomEn) await prisma.rubrique.update({ where: { id: rub.id }, data: { nomEn: r.nomEn, descriptionEn: r.descriptionEn } });
    rubriques.set(r.slug, rub.id);
  }

  const articles = lireArticles();
  const debut = new Date("2025-12-01T08:00:00Z").getTime();
  const ids: string[] = [];
  for (const [i, a] of articles.entries()) {
    const contenu = markdownVersTiptap(a.corps) as unknown as Prisma.InputJsonValue;
    const rubriqueId = rubriques.get(a.rubrique);
    if (!rubriqueId) throw new Error(`Rubrique inconnue : ${a.rubrique}`);
    const datePublication = new Date(debut + i * 26 * 3600 * 1000);
    const donnees = {
      titre: a.titre,
      chapeau: a.chapeau,
      contenu,
      type: a.type,
      imageUneUrl: `/images/mag/${a.slug}.jpg`,
      imageUneAlt: `Illustration de l'article « ${a.titre} » — DIWA MAG, décembre 2025`,
      statut: "PUBLIE" as const,
      aLaUne: a.une !== undefined,
      ordreUne: a.une ?? null,
      tempsLecture: tempsDeLecture(markdownVersTiptap(a.corps)),
      metaDescription: a.chapeau.slice(0, 160),
      datePublication,
      dateMiseAJour: datePublication,
      auteurId: redaction.id,
      rubriqueId,
    };
    const article = await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: { slug: a.slug, ...donnees },
    });
    ids.push(article.id);

    const versions = await prisma.articleVersion.count({ where: { articleId: article.id } });
    if (versions === 0) {
      await prisma.articleVersion.create({
        data: { articleId: article.id, titre: a.titre, contenu, modifieParId: superAdmin.id },
      });
    }

    for (const nom of a.motscles) {
      const motCle = await prisma.motCle.upsert({
        where: { slug: slugify(nom) },
        update: {},
        create: { nom, slug: slugify(nom) },
      });
      await prisma.articleMotCle.upsert({
        where: { articleId_motCleId: { articleId: article.id, motCleId: motCle.id } },
        update: {},
        create: { articleId: article.id, motCleId: motCle.id },
      });
    }
  }

  const numero = await prisma.numero.upsert({
    where: { slug: "diwa-mag-decembre-2025" },
    update: {},
    create: {
      titre: "DIWA MAG — Le magazine de la femme digitale, décembre 2025",
      slug: "diwa-mag-decembre-2025",
      mois: new Date("2025-12-01T00:00:00Z"),
      couvertureUrl: "/images/mag/couverture-decembre-2025.jpg",
      edito:
        "Édition spéciale DigieWomen Awards 2025 : « IA et biodiversité : quand l'intelligence artificielle et la cybersécurité protègent le vivant ». Interview exclusive du président de l'ARCEP, portrait d'Obone AI, focus sur les acteurs qui bougent les lignes du digital au Gabon.",
      publie: true,
      titreEn: "DIWA MAG — The digital woman's magazine, December 2025",
      editoEn: "DigieWomen Awards 2025 special edition: “AI and biodiversity: when artificial intelligence and cybersecurity protect life”. Exclusive interview with the President of ARCEP, a profile of Obone AI, and a focus on the players shaking up digital in Gabon.",
    },
  });
  if (!numero.titreEn) {
    await prisma.numero.update({ where: { id: numero.id }, data: { titreEn: "DIWA MAG — The digital woman's magazine, December 2025", editoEn: "DigieWomen Awards 2025 special edition: “AI and biodiversity: when artificial intelligence and cybersecurity protect life”. Exclusive interview with the President of ARCEP, a profile of Obone AI, and a focus on the players shaking up digital in Gabon." } });
  }
  for (const [ordre, articleId] of ids.entries()) {
    await prisma.numeroArticle.upsert({
      where: { numeroId_articleId: { numeroId: numero.id, articleId } },
      update: {},
      create: { numeroId: numero.id, articleId, ordre },
    });
  }

  // Traductions anglaises des articles (prisma/data/*.en.md), relues : automatique = false.
  const traductions = lireArticles("articles-diwa-mag-decembre-2025.en.md");
  let nbTraductions = 0;
  for (const t of traductions) {
    const article = await prisma.article.findUnique({ where: { slug: t.slug }, select: { id: true } });
    if (!article) continue;
    await prisma.articleTraduction.upsert({
      where: { articleId_langue: { articleId: article.id, langue: "en" } },
      update: {},
      create: {
        articleId: article.id,
        langue: "en",
        titre: t.titre,
        chapeau: t.chapeau,
        contenu: markdownVersTiptap(t.corps) as unknown as Prisma.InputJsonValue,
        automatique: false,
      },
    });
    nbTraductions++;
  }

  await prisma.journalActivite.create({
    data: { adminId: superAdmin.id, action: "SEED", cible: "Base", details: { articles: ids.length } },
  });

  console.log(`Seed terminé : ${RUBRIQUES.length} rubriques, ${ids.length} articles, ${nbTraductions} traductions anglaises, 1 numéro.`);
  console.log(`Super-administrateur : ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
