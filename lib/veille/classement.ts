// Classement automatique d'une actualité : catégories technologiques et zone géographique,
// à partir du titre et de l'extrait. Aucune zone n'est inventée : sans pays reconnu ni zone par
// défaut de la source, l'actualité est classée « Non précisé ».
import { MOTS_INTERNATIONAL, MOTS_TROP_GENERAUX, MOTS_ZONES, type ZoneVeilleCle } from "./defauts";

/** Minuscules, sans accents, ponctuation remplacée par des espaces, bordé d'espaces. */
export function normaliser(texte: string) {
  return ` ${texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

type Categorie = { slug: string; motsCles: string[] };

function compter(texteNormalise: string, texteOriginal: string, motsCles: string[]) {
  let score = 0;
  let specifique = false;
  for (const mot of motsCles) {
    if (mot.startsWith("=")) {
      // Sigle sensible à la casse (IA, AI, UX, UI, IoT).
      const sigle = mot.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|[^A-Za-z0-9])${sigle}([^A-Za-z0-9]|$)`).test(texteOriginal)) {
        score++;
        specifique = true;
      }
      continue;
    }
    const m = normaliser(mot);
    if (texteNormalise.includes(m)) {
      score++;
      if (!MOTS_TROP_GENERAUX.has(m.trim())) specifique = true;
    }
  }
  return { score, specifique };
}

/**
 * Catégories reconnues (3 au plus, de la plus pertinente à la moins pertinente).
 * `technologique` : au moins un mot-clé spécifique (sert à filtrer les médias généralistes).
 */
export function classerCategories(titre: string, extrait: string, categories: Categorie[]) {
  const original = `${titre} ${extrait}`;
  const texte = normaliser(original);
  const titreNormalise = normaliser(titre);
  let technologique = false;
  const scores = categories
    .map((c) => {
      const r = compter(texte, original, c.motsCles);
      // Un mot-clé présent dans le titre compte double.
      const bonus = compter(titreNormalise, titre, c.motsCles).score;
      if (r.specifique) technologique = true;
      return { slug: c.slug, score: r.score + bonus };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
  return { categories: scores.slice(0, 3).map((c) => c.slug), technologique };
}

const ZONES_ORDRE = Object.keys(MOTS_ZONES) as (keyof typeof MOTS_ZONES)[];
// Expressions les plus longues d'abord (« guinee equatoriale » avant « guinee », « soudan du sud » avant « soudan »).
const EXPRESSIONS = ZONES_ORDRE.flatMap((zone) => MOTS_ZONES[zone].map((mot) => ({ zone, mot: normaliser(mot) }))).sort((a, b) => b.mot.length - a.mot.length);

export function classerZone(titre: string, extrait: string, zoneParDefaut: ZoneVeilleCle | null): ZoneVeilleCle {
  let texte = normaliser(`${titre} ${extrait}`);
  const compte = new Map<string, number>();
  for (const { zone, mot } of EXPRESSIONS) {
    let i = texte.indexOf(mot);
    while (i !== -1) {
      compte.set(zone, (compte.get(zone) ?? 0) + 1);
      texte = texte.slice(0, i) + " ".repeat(mot.length - 1) + texte.slice(i + mot.length - 1);
      i = texte.indexOf(mot);
    }
  }
  if (compte.has("GABON")) return "GABON";
  const meilleure = [...compte.entries()].sort((a, b) => b[1] - a[1])[0];
  if (meilleure) return meilleure[0] as ZoneVeilleCle;
  // Aucun pays africain : un pays ou une ville hors d'Afrique cité → International.
  if (MOTS_INTERNATIONAL.some((m) => texte.includes(normaliser(m)))) return "INTERNATIONAL";
  return zoneParDefaut ?? "NON_PRECISE";
}

/** Zones incluses dans un filtre : « Afrique centrale » comprend le Gabon. */
export function zonesDuFiltre(zone: ZoneVeilleCle): ZoneVeilleCle[] {
  return zone === "AFRIQUE_CENTRALE" ? ["AFRIQUE_CENTRALE", "GABON"] : [zone];
}
