// Analyse de secours, sans IA (clé ANTHROPIC_API_KEY absente) : structure approximative déduite
// des tailles de police et des positions. Toujours signalée comme telle au rédacteur.
import "server-only";
import { slugify } from "@/lib/content";
import type { Extraction, LigneTexte } from "./extraction";
import type { Analyse, Bloc, ImageAnalyse } from "./schema";

type Groupe = { page: number; taille: number; texte: string; y: number; yFin: number; yDerniere: number; x: number; xFin: number };

const bloc = (type: Bloc["type"], texte: string, page: number, extra: Partial<Bloc> = {}): Bloc => ({
  type,
  texte,
  niveau: null,
  elements: null,
  ordonnee: null,
  attribution: null,
  titre: null,
  imageId: null,
  page,
  aVerifier: false,
  ...extra,
});

function grouper(lignes: LigneTexte[]): Groupe[] {
  // Interligne habituel (médiane des écarts positifs entre lignes de même style) : un écart
  // nettement supérieur marque un nouveau paragraphe.
  const ecarts: number[] = [];
  for (let i = 1; i < lignes.length; i++) {
    const a = lignes[i - 1];
    const b = lignes[i];
    if (a.page === b.page && Math.abs(a.taille - b.taille) < 0.6) {
      const e = (b.boite.y - (a.boite.y + a.boite.h)) / b.boite.h;
      if (e > -0.5 && e < 3) ecarts.push(e);
    }
  }
  ecarts.sort((x, y) => x - y);
  const interligne = ecarts.length ? ecarts[Math.floor(ecarts.length / 2)] : 0.2;
  const seuil = interligne + 0.3;

  const groupes: Groupe[] = [];
  for (const l of lignes) {
    const g = groupes.at(-1);
    const memeStyle = g && g.page === l.page && Math.abs(g.taille - l.taille) < 0.6;
    const ecart = g ? (l.boite.y - g.yFin) / l.boite.h : 0;
    // Même ligne (morceaux successifs) ou ligne suivante du même paragraphe.
    const memeLigne = g && memeStyle && Math.abs(l.boite.y - g.yDerniere) < l.boite.h * 0.3;
    if (g && memeStyle && (memeLigne || (ecart > -0.5 && ecart <= seuil))) {
      // Sur une même ligne, un espace sépare deux morceaux distants (texte justifié découpé mot à mot).
      const espace = l.boite.x - g.xFin > 0.002 && !/\s$/.test(g.texte) && !/^\s/.test(l.texte) ? " " : "";
      g.texte = memeLigne ? `${g.texte}${espace}${l.texte}` : /[-‐]$/.test(g.texte) ? g.texte.slice(0, -1) + l.texte.trimStart() : `${g.texte} ${l.texte.trim()}`;
      g.yFin = Math.max(g.yFin, l.boite.y + l.boite.h);
      g.yDerniere = l.boite.y;
      g.xFin = l.boite.x + l.boite.l;
    } else {
      groupes.push({ page: l.page, taille: l.taille, texte: l.texte, y: l.boite.y, yFin: l.boite.y + l.boite.h, yDerniere: l.boite.y, x: l.boite.x, xFin: l.boite.x + l.boite.l });
    }
  }
  // Un bloc qui commence par une minuscule prolonge le précédent de même style
  // (changement de colonne ou de page au milieu d'une phrase).
  const fusionnes: Groupe[] = [];
  for (const g of groupes.map((x) => ({ ...x, texte: x.texte.replace(/\s+/g, " ").trim() })).filter((x) => x.texte)) {
    const prec = fusionnes.at(-1);
    if (prec && /^[a-zà-ÿ]/.test(g.texte) && Math.abs(prec.taille - g.taille) < 0.6 && g.page - prec.page <= 1) {
      prec.texte = /[-‐]$/.test(prec.texte) ? prec.texte.slice(0, -1) + g.texte : `${prec.texte} ${g.texte}`;
      continue;
    }
    fusionnes.push(g);
  }
  return fusionnes;
}

/** Colonne approximative (gauche / droite) pour l'ordre de lecture. */
const colonne = (x: number) => (x < 0.48 ? 0 : 1);
/** « C Y B E R » → « CYBER » (texte espacé lettre par lettre). */
const resserrer = (t: string) => (/^(\S ){3,}\S$/.test(t) ? t.replace(/ (?=\S)/g, "") : t);

export function analyserSansIa(extraction: Extraction, titreParDefaut: string): Analyse {
  const avertissements = ["Analyse automatique sans IA (clé ANTHROPIC_API_KEY non configurée) : la structure est approximative, relisez tout l'article."];
  let groupes = grouper(extraction.lignes);

  // En-têtes et pieds de page : textes identiques répétés sur plusieurs pages.
  const occurrences = new Map<string, Set<number>>();
  for (const g of groupes) occurrences.set(g.texte, (occurrences.get(g.texte) ?? new Set()).add(g.page));
  groupes = groupes.filter((g) => (occurrences.get(g.texte)?.size ?? 0) < 2 && !/^\d{1,3}$/.test(g.texte));

  // Taille du corps de texte : la plus fréquente, pondérée par le nombre de caractères.
  const poids = new Map<number, number>();
  for (const g of groupes) poids.set(Math.round(g.taille), (poids.get(Math.round(g.taille)) ?? 0) + g.texte.length);
  const corps = [...poids.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;

  const premierePage = groupes[0]?.page ?? 1;
  const titreG = groupes.filter((g) => g.page === premierePage).sort((a, b) => b.taille - a.taille)[0];
  const titre = titreG?.texte ?? titreParDefaut;
  groupes = groupes.filter((g) => g !== titreG);

  // Surtitre : texte situé au-dessus du titre sur la première page.
  const avantTitre = titreG ? groupes.filter((g) => g.page === premierePage && g.y < titreG.y && g.taille >= corps * 0.8) : [];
  const surtitre = avantTitre.length ? avantTitre.map((g) => resserrer(g.texte)).join(" · ") : null;
  groupes = groupes.filter((g) => !avantTitre.includes(g));

  // Signature « Par … » : reprise comme auteur mentionné, retirée du texte.
  const signature = groupes.find((g) => /^(par|by)\s+\S/i.test(g.texte) && g.texte.length < 80);
  const auteurMentionne = signature ? signature.texte.replace(/^(par|by)\s+/i, "") : null;
  groupes = groupes.filter((g) => g !== signature);

  let chapeau: string | null = null;
  const apresTitre = groupes.find((g) => g.page === premierePage && (!titreG || g.y >= titreG.y));
  if (apresTitre && apresTitre.taille > corps * 1.05 && apresTitre.texte.length > 60) {
    chapeau = apresTitre.texte;
    groupes = groupes.filter((g) => g !== apresTitre);
  }

  // Images : décoratives si répétées ou pleine page ; la plus grande devient l'image principale.
  const editoriales = extraction.images.filter((i) => i.repetitions < 2 && !i.pleinePage);
  const principale = [...editoriales].sort((a, b) => b.boite.l * b.boite.h - a.boite.l * a.boite.h)[0];
  const legendes = new Map<string, string>();
  const images: ImageAnalyse[] = extraction.images.map((i) => {
    const decorative = !editoriales.includes(i);
    // Légende probable : petit texte juste sous l'image.
    const leg = groupes.find((g) => g.page === i.page && g.taille < corps * 0.92 && g.y >= i.boite.y + i.boite.h - 0.01 && g.y - (i.boite.y + i.boite.h) < 0.05 && g.x < i.boite.x + i.boite.l);
    if (leg && !decorative) legendes.set(i.id, leg.texte);
    return {
      imageId: i.id,
      role: decorative ? "decoration" : i === principale ? "principale" : "illustration",
      alt: "",
      legende: leg && !decorative ? leg.texte : null,
      credit: null,
      section: null,
      confiance: "faible",
    };
  });
  const textesLegendes = new Set(legendes.values());
  groupes = groupes.filter((g) => !textesLegendes.has(g.texte));

  const blocs: Bloc[] = [];
  const positions: { page: number; col: number; y: number }[] = [];
  let ignores = 0;
  for (const g of groupes) {
    if (g.taille < corps * 0.8) {
      ignores++;
      continue;
    }
    const precedent = blocs.at(-1);
    // Paragraphe coupé par un changement de colonne ou de page : il reprend par une minuscule.
    if (precedent?.type === "paragraphe" && /^[a-zà-ÿ]/.test(g.texte) && Math.abs(g.taille - corps) < 1) {
      precedent.texte = /[-‐]$/.test(precedent.texte) ? precedent.texte.slice(0, -1) + g.texte : `${precedent.texte} ${g.texte}`;
      continue;
    }
    if (/^[«“"]/.test(g.texte) && g.taille >= corps * 1.1) blocs.push(bloc("citation", g.texte.replace(/^[«“"]\s*/, "").replace(/\s*[»”"]$/, ""), g.page));
    else if (g.taille >= corps * 1.25 && g.texte.length < 140) blocs.push(bloc("intertitre", g.texte, g.page, { niveau: 2 }));
    else blocs.push(bloc("paragraphe", g.texte, g.page));
    positions.push({ page: g.page, col: colonne(g.x), y: g.y });
  }
  if (ignores) avertissements.push(`${ignores} petit(s) texte(s) (notes, folios, mentions) écarté(s) : vérifiez qu'il ne manque rien.`);

  // Place chaque image éditoriale après le dernier bloc qui la précède dans l'ordre de lecture
  // (même page, colonne précédente ou plus haut dans la même colonne).
  const avecImages: { bloc: Bloc; page: number; col: number; y: number }[] = blocs.map((b, i) => ({ bloc: b, ...positions[i] }));
  for (const i of editoriales) {
    if (i === principale) continue;
    const col = colonne(i.boite.x + i.boite.l / 2 - 0.01);
    let position = avecImages.findIndex((e) => e.page > i.page);
    if (position === -1) position = avecImages.length;
    for (let k = 0; k < avecImages.length; k++) {
      const e = avecImages[k];
      if (e.page === i.page && (e.col < col || (e.col === col && e.y < i.boite.y))) position = k + 1;
    }
    avecImages.splice(position, 0, { bloc: bloc("image", "", i.page, { imageId: i.id }), page: i.page, col, y: i.boite.y });
  }
  blocs.splice(0, blocs.length, ...avecImages.map((e) => e.bloc));

  const scannees = extraction.pages.filter((p) => p.scannee).map((p) => p.numero);
  if (scannees.length) avertissements.push(`Page(s) ${scannees.join(", ")} sans texte sélectionnable : impossible à lire sans l'analyse par IA.`);
  avertissements.push("Les textes alternatifs des images sont à rédiger.");

  const resume = (chapeau ?? blocs.find((b) => b.type === "paragraphe")?.texte ?? "").slice(0, 155);
  return {
    titre,
    surtitre,
    sousTitre: null,
    chapeau,
    auteurMentionne,
    rubrique: null,
    type: "ACTUALITE",
    blocs,
    images,
    zones: [],
    imageUne: principale?.id ?? null,
    seo: {
      slug: slugify(titre).slice(0, 80),
      metaTitre: titre.slice(0, 60),
      metaDescription: resume.length === 155 ? resume.replace(/\s+\S*$/, "…") : resume,
      motsCles: [],
    },
    avertissements,
  };
}
