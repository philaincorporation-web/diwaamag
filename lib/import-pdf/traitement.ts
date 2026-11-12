// Orchestration d'un import : lecture du PDF source → extraction → analyse (IA ou heuristique)
// → envoi des images → résultat validé, en attente de vérification par un administrateur.
// Aucune publication n'a lieu ici : l'article n'est créé (en brouillon) qu'après validation humaine.
import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { IMPORT_PDF, analyseIaDisponible } from "./config";
import { ErreurImport, empreinteSha256, extrairePdf, recadrerZone } from "./extraction";
import { analyserAvecClaude } from "./analyse-ia";
import { analyserSansIa } from "./heuristique";
import { enregistrerImage, lireSource, modeStockage } from "./stockage";
import { ResultatImportSchema, type ImageStockee } from "./schema";

class ImportAnnule extends Error {}

async function etape(id: string, libelle: string, progression: number) {
  const r = await prisma.importPdf.updateMany({ where: { id, statut: "EN_COURS" }, data: { etape: libelle, progression } });
  if (!r.count) throw new ImportAnnule();
}

/** Marque comme échoués les traitements bloqués (fonction interrompue, délai dépassé). */
export async function libererTraitementsBloques() {
  const limite = new Date(Date.now() - IMPORT_PDF.dureeMaxTraitementMin * 60_000);
  await prisma.importPdf.updateMany({
    where: { statut: { in: ["EN_COURS", "EN_ATTENTE"] }, OR: [{ debutTraitement: { lt: limite } }, { debutTraitement: null, modifieLe: { lt: limite } }] },
    data: { statut: "ECHEC", erreur: "Le traitement a été interrompu (délai dépassé). Vous pouvez le relancer.", etape: null },
  });
}

export async function traiterImport(id: string) {
  // Prise en charge atomique : un seul traitement à la fois pour un même import.
  const pris = await prisma.importPdf.updateMany({
    where: { id, statut: "EN_ATTENTE" },
    data: { statut: "EN_COURS", debutTraitement: new Date(), tentatives: { increment: 1 }, erreur: null, etape: "Lecture du fichier", progression: 5 },
  });
  if (!pris.count) return;

  try {
    const imp = await prisma.importPdf.findUniqueOrThrow({ where: { id } });
    const octets = await lireSource(imp);
    if (octets.byteLength > IMPORT_PDF.tailleMaxMo * 1024 * 1024) throw new ErreurImport(`Le fichier dépasse ${IMPORT_PDF.tailleMaxMo} Mo.`);
    if (empreinteSha256(octets) !== imp.empreinte) throw new ErreurImport("Le fichier reçu ne correspond pas au fichier envoyé : recommencez l'import.");

    await etape(id, "Extraction du texte et des images", 15);
    const extraction = await extrairePdf(octets);
    await prisma.importPdf.update({ where: { id }, data: { pages: extraction.pages.length } });

    const ia = analyseIaDisponible();
    await etape(id, ia ? "Analyse éditoriale par l'IA (1 à 3 minutes)" : "Analyse automatique (sans IA)", 35);
    const rubriques = await prisma.rubrique.findMany({ select: { slug: true, nom: true, description: true }, orderBy: { ordre: "asc" } });
    const r = ia
      ? await analyserAvecClaude(octets, extraction, rubriques)
      : { analyse: analyserSansIa(extraction, imp.nomFichier.replace(/\.pdf$/i, "")), modele: "heuristique", tokensEntree: 0, tokensSortie: 0 };
    const analyse = r.analyse;
    if (analyse.rubrique && !rubriques.some((x) => x.slug === analyse.rubrique)) analyse.rubrique = null;

    await etape(id, "Préparation des images", 75);
    const mode = modeStockage();
    const roles = new Map([...analyse.images.map((i) => [i.imageId, i.role] as const), ...analyse.zones.map((z) => [z.id, z.role] as const)]);
    const utilisees = new Set([analyse.imageUne, ...analyse.blocs.map((b) => b.imageId)].filter(Boolean) as string[]);
    const images: ImageStockee[] = [];
    let decoratives = 0;
    for (const img of extraction.images) {
      // Les éléments décoratifs ne sont pas importés, sauf si l'analyse les a placés dans l'article.
      if (roles.get(img.id) === "decoration" && !utilisees.has(img.id)) {
        decoratives++;
        continue;
      }
      const s = await enregistrerImage(mode, id, img.id, img.fichier, img.format);
      images.push({ id: img.id, origine: "extraite", page: img.page, ...s, largeur: img.largeurPx, hauteur: img.hauteurPx, repetitions: img.repetitions, boite: img.boite });
    }
    for (const z of analyse.zones) {
      if (z.role === "decoration" && !utilisees.has(z.id)) continue;
      const raster = extraction.rasters.find((x) => x.page === z.page);
      const decoupe = raster ? await recadrerZone(raster, z.boite) : null;
      if (!decoupe) continue;
      const s = await enregistrerImage(mode, id, z.id, decoupe.fichier, "jpeg");
      images.push({ id: z.id, origine: "recadree", page: z.page, ...s, largeur: decoupe.largeurPx, hauteur: decoupe.hauteurPx, repetitions: 1, boite: z.boite });
    }

    const avertissements = [...extraction.avertissements, ...analyse.avertissements];
    if (decoratives) avertissements.push(`${decoratives} élément(s) décoratif(s) (logos, motifs, fonds) non importé(s).`);
    if (images.some((i) => i.origine === "recadree")) avertissements.push("Des photos ont été recadrées automatiquement sur des pages scannées : vérifiez les cadrages.");
    if (analyse.auteurMentionne) avertissements.push(`Auteur mentionné dans le PDF : « ${analyse.auteurMentionne} ». L'article sera rattaché à votre compte : ajoutez la signature dans le texte si nécessaire.`);

    const resultat = ResultatImportSchema.parse({
      analyse,
      images,
      pages: extraction.pages.map((p) => ({ numero: p.numero, scannee: p.scannee })),
      avertissements,
    });
    await prisma.importPdf.updateMany({
      where: { id, statut: "EN_COURS" },
      data: {
        statut: "A_VERIFIER",
        etape: null,
        progression: 100,
        resultat: resultat as unknown as Prisma.InputJsonValue,
        modele: r.modele,
        tokensEntree: r.tokensEntree || null,
        tokensSortie: r.tokensSortie || null,
      },
    });
  } catch (e) {
    if (e instanceof ImportAnnule) return;
    const message = e instanceof ErreurImport ? e.message : "Erreur technique pendant le traitement. Vous pouvez relancer l'import.";
    if (!(e instanceof ErreurImport)) console.error(`Import PDF ${id} :`, e);
    await prisma.importPdf.updateMany({ where: { id, statut: "EN_COURS" }, data: { statut: "ECHEC", erreur: message, etape: null } });
  }
}
