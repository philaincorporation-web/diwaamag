// Extraction technique d'un PDF : pages, lignes de texte positionnées, images positionnées.
// Bibliothèque : unpdf (moteur PDF.js de Mozilla, licence Apache 2.0 / MIT) — exécutée sans
// exécution de code : les scripts JavaScript du PDF sont ignorés par PDF.js, les formulaires XFA
// désactivés, et les liens ne sont jamais suivis.
import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { extractImages, extractTextItems, getDocumentProxy, inspectPages } from "unpdf";
import { IMPORT_PDF } from "./config";

/** Boîte en fraction de la page (0 à 1), origine en haut à gauche. */
export type Boite = { x: number; y: number; l: number; h: number };

export type LigneTexte = { page: number; texte: string; boite: Boite; taille: number };

export type PageExtraite = {
  numero: number;
  largeur: number;
  hauteur: number;
  caracteres: number;
  /** Page sans texte exploitable (probablement scannée) : sa lecture passe par l'analyse visuelle. */
  scannee: boolean;
};

export type ImageExtraite = {
  id: string; // « p2-i1 »
  page: number;
  boite: Boite;
  largeurPx: number;
  hauteurPx: number;
  /** Nombre de pages où la même image apparaît (logo, filigrane… → probablement décorative). */
  repetitions: number;
  /** Image couvrant presque toute la page (fond, scan). */
  pleinePage: boolean;
  empreinte: string;
  fichier: Buffer;
  format: "jpeg" | "png";
};

/** Rendu d'une page scannée ou aplatie (calques pleine page superposés) : sert à recadrer ses photos. */
export type RasterPage = { page: number; fichier: Buffer; largeurPx: number; hauteurPx: number };

export type Extraction = { pages: PageExtraite[]; lignes: LigneTexte[]; images: ImageExtraite[]; rasters: RasterPage[]; avertissements: string[] };

export class ErreurImport extends Error {}

/** Vérifie la signature réelle du fichier (et non son extension ou le type annoncé par le navigateur). */
export function verifierSignaturePdf(octets: Uint8Array) {
  const entete = Buffer.from(octets.subarray(0, 1024)).toString("latin1");
  if (!entete.includes("%PDF-")) throw new ErreurImport("Ce fichier n'est pas un PDF valide.");
}

export function empreinteSha256(octets: Uint8Array) {
  return createHash("sha256").update(octets).digest("hex");
}

const arrondi = (n: number) => Math.round(n * 1000) / 1000;

export async function extrairePdf(octets: Uint8Array): Promise<Extraction> {
  verifierSignaturePdf(octets);
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(octets), {
      isOffscreenCanvasSupported: false,
      isImageDecoderSupported: false,
      enableXfa: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/password/i.test(message)) throw new ErreurImport("Ce PDF est protégé par un mot de passe : retirez la protection avant de l'importer.");
    throw new ErreurImport("Le PDF est illisible ou endommagé.");
  }
  if (pdf.numPages < 1) throw new ErreurImport("Le PDF ne contient aucune page.");
  if (pdf.numPages > IMPORT_PDF.pagesMax) {
    throw new ErreurImport(`Le PDF compte ${pdf.numPages} pages : la limite est de ${IMPORT_PDF.pagesMax} pages par article.`);
  }

  const avertissements: string[] = [];
  const [inspection, texte] = await Promise.all([inspectPages(pdf), extractTextItems(pdf)]);

  const pages: PageExtraite[] = [];
  const lignes: LigneTexte[] = [];
  const brutes: Omit<ImageExtraite, "repetitions" | "id">[] = [];
  const couches = new Map<number, { pixels: Buffer; largeur: number; hauteur: number }[]>();

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vue = page.getViewport({ scale: 1 });
    const [, , L, H] = page.view; // boîte en coordonnées PDF
    const largeur = L - page.view[0];
    const hauteur = H - page.view[1];
    const insp = inspection.pages[n - 1];
    const visibles = insp.textLength - insp.invisibleTextLength;
    const scannee = visibles < 40 && insp.imageCoverage > 0.5;
    pages.push({ numero: n, largeur: Math.round(vue.width), hauteur: Math.round(vue.height), caracteres: visibles, scannee });

    for (const item of texte.items[n - 1] ?? []) {
      const t = item.str.replace(/\s+/g, " ");
      if (!t.trim()) continue;
      lignes.push({
        page: n,
        texte: t,
        taille: arrondi(item.fontSize),
        boite: {
          x: arrondi((item.x - page.view[0]) / largeur),
          y: arrondi(1 - (item.y - page.view[1] + item.fontSize) / hauteur),
          l: arrondi(item.width / largeur),
          h: arrondi(item.fontSize / hauteur),
        },
      });
    }

    let images;
    try {
      images = await extractImages(pdf, n);
    } catch {
      avertissements.push(`Page ${n} : certaines images n'ont pas pu être extraites.`);
      continue;
    }
    for (const img of images) {
      if (img.width < IMPORT_PDF.imagePixelsMin || img.height < IMPORT_PDF.imagePixelsMin) continue;
      const boite = {
        x: arrondi((img.bounds.x - page.view[0]) / largeur),
        y: arrondi(1 - (img.bounds.y - page.view[1] + img.bounds.height) / hauteur),
        l: arrondi(img.bounds.width / largeur),
        h: arrondi(img.bounds.height / hauteur),
      };
      if (boite.l * boite.h < 0.01) continue; // vignette minuscule sur la page
      const pixels = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
      // Image uniforme (calque vide, aplat de couleur) : rien d'éditorial.
      const stats = await sharp(pixels, { raw: { width: img.width, height: img.height, channels: 4 } }).stats();
      if (stats.channels.every((c) => c.stdev < 4)) continue;
      if (scannee && boite.l * boite.h > 0.85) {
        // Page scannée ou aplatie : ses calques pleine page forment le rendu de la page, pas des photos.
        const liste = couches.get(n) ?? [];
        liste.push({ pixels, largeur: img.width, hauteur: img.height });
        couches.set(n, liste);
        continue;
      }
      const empreinte = createHash("sha1").update(pixels).digest("hex");
      const transparente = aDeLaTransparence(pixels);
      const base = sharp(pixels, { raw: { width: img.width, height: img.height, channels: 4 } });
      const fichier = transparente ? await base.png({ compressionLevel: 9 }).toBuffer() : await base.flatten({ background: "#ffffff" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
      brutes.push({
        page: n,
        boite,
        largeurPx: img.width,
        hauteurPx: img.height,
        pleinePage: boite.l * boite.h > 0.85,
        empreinte,
        fichier,
        format: transparente ? "png" : "jpeg",
      });
    }
  }

  // Regroupe les images identiques répétées sur plusieurs pages (logos, fonds) : une seule entrée.
  const vues = new Map<string, ImageExtraite>();
  const compteParPage = new Map<number, number>();
  for (const b of brutes) {
    const deja = vues.get(b.empreinte);
    if (deja) {
      deja.repetitions++;
      continue;
    }
    const rang = (compteParPage.get(b.page) ?? 0) + 1;
    compteParPage.set(b.page, rang);
    vues.set(b.empreinte, { ...b, id: `p${b.page}-i${rang}`, repetitions: 1 });
  }
  let images = [...vues.values()];
  if (images.length > IMPORT_PDF.imagesMax) {
    avertissements.push(`Le document contient ${images.length} images : seules les ${IMPORT_PDF.imagesMax} plus grandes ont été conservées.`);
    images = images.sort((a, b) => b.boite.l * b.boite.h - a.boite.l * a.boite.h).slice(0, IMPORT_PDF.imagesMax);
    images.sort((a, b) => a.page - b.page || a.boite.y - b.boite.y);
  }
  const rasters: RasterPage[] = [];
  for (const [page, liste] of couches) {
    const raster = await composerPage(page, liste);
    // Calques sans contenu photographique (masques, fonds) : pas un scan, rien à recadrer.
    // Mesure simple : un JPEG presque vide pèse très peu par pixel, un scan ou une photo beaucoup plus.
    if (raster.fichier.length / (raster.largeurPx * raster.hauteurPx) > 0.02) rasters.push(raster);
  }
  const scannees = pages.filter((p) => p.scannee).map((p) => p.numero);
  if (scannees.length) avertissements.push(`Page(s) ${scannees.join(", ")} sans texte sélectionnable (document scanné ?) : lecture par analyse visuelle, à relire attentivement.`);
  await pdf.cleanup();
  return { pages, lignes, images, rasters, avertissements };
}

/** Superpose les calques pleine page (dans l'ordre de peinture) pour reconstituer la page. */
async function composerPage(page: number, liste: { pixels: Buffer; largeur: number; hauteur: number }[]): Promise<RasterPage> {
  const [base, ...autres] = liste; // le premier calque peint est le fond
  const largeur = base.largeur;
  const hauteur = base.hauteur;
  const calques = await Promise.all(
    autres.map(async (c) => ({
      input: await sharp(c.pixels, { raw: { width: c.largeur, height: c.hauteur, channels: 4 } }).resize(largeur, hauteur, { fit: "fill" }).png().toBuffer(),
    })),
  );
  const fichier = await sharp(base.pixels, { raw: { width: largeur, height: hauteur, channels: 4 } })
    .composite(calques)
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return { page, fichier, largeurPx: largeur, hauteurPx: hauteur };
}

/** Recadre une zone (en fraction de page) dans le rendu d'une page scannée. */
export async function recadrerZone(raster: RasterPage, boite: Boite) {
  const bornes = (v: number) => Math.min(1, Math.max(0, v));
  const x = Math.round(bornes(boite.x) * raster.largeurPx);
  const y = Math.round(bornes(boite.y) * raster.hauteurPx);
  const l = Math.min(raster.largeurPx - x, Math.round(bornes(boite.l) * raster.largeurPx));
  const h = Math.min(raster.hauteurPx - y, Math.round(bornes(boite.h) * raster.hauteurPx));
  if (l < 40 || h < 40) return null;
  const fichier = await sharp(raster.fichier).extract({ left: x, top: y, width: l, height: h }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return { fichier, largeurPx: l, hauteurPx: h };
}

function aDeLaTransparence(rgba: Buffer) {
  for (let i = 3; i < rgba.length; i += 4 * 7) if (rgba[i] < 250) return true;
  return false;
}
