// Premières campagnes publicitaires (visuels dans public/pubs/<campagne>/), créées en base comme
// depuis le back-office › Publicités. Idempotent : une campagne déjà présente (même identifiant) n'est
// pas modifiée, pour ne jamais écraser une correction faite dans le back-office ni ses compteurs.
//
//   npx tsx scripts/campagnes-initiales.mts                    (base locale, fichier .env)
//   npx tsx scripts/campagnes-initiales.mts --env .env.neon    (base de production, après déploiement)
//
// Formats utilisés : billboard 970 × 250 (HP-01) et rectangle 300 × 250 (HP-02, ART-02).
// Les visuels half-page (300 × 600) et newsletter (600 × 150) sont prêts pour la phase 2.
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type EmplacementPub } from "../lib/generated/prisma/client.ts";

const args = process.argv.slice(2);
const iEnv = args.indexOf("--env");
const fichierEnv = iEnv >= 0 ? args[iEnv + 1] : ".env";
config({ path: fichierEnv, override: true, quiet: true });
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error(`Aucune DIRECT_URL ni DATABASE_URL dans ${fichierEnv}.`);
console.log(`Base visée : ${url.replace(/^.*@/, "").replace(/[/?].*$/, "")}\n`);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) });

const DIWAA = { annonceur: "DigieWomen Awards Africa", lien: "https://www.digiewomenawards.com" };
const MOOV = { annonceur: "Moov Africa Gabon Telecom", lien: "https://www.moov-africa.ga" };
/** Fin de diffusion : le jour indiqué à 23 h 59, heure de Libreville. */
const finLe = (jour: string) => new Date(`${jour}T23:59:59+01:00`);

type Visuel = { annonceur: string; lien: string; alt: string; altEn: string; fin?: Date };
const VISUELS: Record<string, Visuel> = {
  "votez-maintenant": {
    ...DIWAA,
    alt: "DigieWomen Awards Africa 2026 : votez maintenant, du 3 novembre au 16 décembre 2026, sur digiewomenawards.com et zekin.me/diwaa26. Le participant qui vote le plus remporte 1 000 000 FCFA.",
    altEn: "DigieWomen Awards Africa 2026: vote now, from 3 November to 16 December 2026, at digiewomenawards.com and zekin.me/diwaa26. The participant who votes the most wins 1,000,000 FCFA.",
    fin: finLe("2026-12-16"),
  },
  "femme-digitale": {
    ...DIWAA,
    alt: "Qui sera la femme digitale de l'année ? DigieWomen Awards Africa, 4e édition, vendredi 18 décembre 2026 au Palais des Congrès : 5 000 000 FCFA et un billet d'avion à gagner.",
    altEn: "Who will be the digital woman of the year? DigieWomen Awards Africa, 4th edition, Friday 18 December 2026 at the Palais des Congrès: 5,000,000 FCFA and a plane ticket to win.",
    fin: finLe("2026-12-18"),
  },
  jury: {
    ...DIWAA,
    alt: "DigieWomen Awards Africa 2026 : les membres du jury, présidé par Aline Sylvie Minko Mi Etoua. Cérémonie le 18 décembre 2026 au Palais des Congrès.",
    altEn: "DigieWomen Awards Africa 2026: the members of the jury, chaired by Aline Sylvie Minko Mi Etoua. Ceremony on 18 December 2026 at the Palais des Congrès.",
    fin: finLe("2026-12-18"),
  },
  "dejeuner-prive": {
    ...DIWAA,
    alt: "Déjeuner privé des DigieWomen Awards le 18 décembre à Libreville avec Elisabeth Moreno : leadership stratégique, entrepreneuriat et transmission. Inscription en ligne.",
    altEn: "DigieWomen Awards private lunch on 18 December in Libreville with Elisabeth Moreno: strategic leadership, entrepreneurship and legacy. Register online.",
    fin: finLe("2026-12-18"),
  },
  "moov-5g-rejoignez": {
    ...MOOV,
    alt: "Moov Africa Gabon Telecom : rejoignez la 5G.",
    altEn: "Moov Africa Gabon Telecom: join 5G.",
  },
  "moov-5g-villes": {
    ...MOOV,
    alt: "Moov Africa : rejoignez la 5G, déjà accessible à Libreville, Akanda, Owendo et Port-Gentil.",
    altEn: "Moov Africa: join 5G, already available in Libreville, Akanda, Owendo and Port-Gentil.",
  },
  "moov-mia-333": {
    ...MOOV,
    alt: "Moov Africa : découvrez MIA, l'assistant IA accessible même sans Internet. Appelez MIA au 333.",
    altEn: "Moov Africa: meet MIA, the AI assistant available even without internet. Call MIA on 333.",
  },
};

/** [visuel, emplacement, format du fichier, poids de rotation] */
const CAMPAGNES: [string, EmplacementPub, "billboard" | "rectangle", number][] = [
  // HP-01 — billboard (avec le visuel DigieWomen Awards permanent ; 2 campagnes tirées par page)
  ["votez-maintenant", "HAUT_PAGE", "billboard", 2],
  ["moov-5g-rejoignez", "HAUT_PAGE", "billboard", 1],
  ["moov-mia-333", "HAUT_PAGE", "billboard", 1],
  ["femme-digitale", "HAUT_PAGE", "billboard", 1],
  // HP-02 — rectangle de la colonne latérale
  ["moov-5g-villes", "BARRE_LATERALE", "rectangle", 1],
  ["jury", "BARRE_LATERALE", "rectangle", 1],
  ["dejeuner-prive", "BARRE_LATERALE", "rectangle", 1],
  // ART-02 — rectangle dans le texte des articles
  ["moov-mia-333", "ARTICLE_MILIEU", "rectangle", 1],
  ["votez-maintenant", "ARTICLE_MILIEU", "rectangle", 1],
  ["femme-digitale", "ARTICLE_MILIEU", "rectangle", 1],
];

const CODES: Partial<Record<EmplacementPub, string>> = { HAUT_PAGE: "HP-01", BARRE_LATERALE: "HP-02", ARTICLE_MILIEU: "ART-02" };

try {
  let crees = 0;
  for (const [visuel, emplacement, format, poids] of CAMPAGNES) {
    const v = VISUELS[visuel];
    const id = `initiale-${visuel}-${emplacement.toLowerCase().replace(/_/g, "-")}`;
    const existe = await prisma.publicite.findUnique({ where: { id }, select: { id: true } });
    if (existe) {
      console.log(`déjà présente  ${CODES[emplacement]}  ${visuel}`);
      continue;
    }
    await prisma.publicite.create({
      data: {
        id,
        nom: `${visuel} — ${CODES[emplacement]}`,
        annonceur: v.annonceur,
        emplacement,
        imageUrl: `/pubs/${visuel}/${format}.jpg`,
        imageAlt: v.alt,
        imageAltEn: v.altEn,
        langue: "TOUTES",
        lien: v.lien,
        fin: v.fin ?? null,
        poids,
        actif: true,
      },
    });
    crees += 1;
    console.log(`créée          ${CODES[emplacement]}  ${visuel}`);
  }
  console.log(`\n${crees} campagne(s) créée(s). Les pages se mettent à jour dans l'heure (cache) ;`);
  console.log("pour un effet immédiat, enregistrer une campagne dans le back-office › Publicités.");
} finally {
  await prisma.$disconnect();
}
