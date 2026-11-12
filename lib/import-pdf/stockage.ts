// Stockage des fichiers d'un import : PDF source (privé, supprimé après la période de conservation)
// et images extraites. Cloudinary en production ; dossier local en développement uniquement.
import "server-only";
import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cloudinaryActif, dossierCloudinary, envoyerCloudinary, supprimerCloudinary, urlTelechargementPrive } from "@/lib/cloudinary";
import { ErreurImport } from "./extraction";

export type ModeStockage = "cloudinary" | "local";

export function modeStockage(): ModeStockage {
  if (cloudinaryActif()) return "cloudinary";
  if (process.env.NODE_ENV === "production") throw new ErreurImport("Stockage des médias non configuré (variables CLOUDINARY_*).");
  return "local";
}

const DOSSIER_LOCAL = () => path.join(process.cwd(), ".imports");
export const cheminSourceLocale = (nom: string) => path.join(DOSSIER_LOCAL(), path.basename(nom));
/** public_id Cloudinary du PDF source (ressource brute privée : jamais accessible publiquement). */
export const idSourceCloudinary = (importId: string) => `${dossierCloudinary()}/imports-pdf/${importId}.pdf`;

export async function enregistrerSourceLocale(importId: string, octets: Uint8Array) {
  await mkdir(DOSSIER_LOCAL(), { recursive: true });
  await writeFile(cheminSourceLocale(`${importId}.pdf`), octets);
}

export async function lireSource(imp: { stockage: string; sourceId: string }): Promise<Uint8Array> {
  if (imp.stockage === "local") {
    try {
      return new Uint8Array(await readFile(cheminSourceLocale(imp.sourceId)));
    } catch {
      throw new ErreurImport("Le fichier PDF source est introuvable (supprimé ou envoi incomplet).");
    }
  }
  const res = await fetch(urlTelechargementPrive(imp.sourceId));
  if (!res.ok) throw new ErreurImport("Le fichier PDF source est introuvable sur le stockage (supprimé ou envoi incomplet).");
  return new Uint8Array(await res.arrayBuffer());
}

export async function supprimerSource(imp: { stockage: string; sourceId: string }) {
  if (imp.stockage === "local") await unlink(cheminSourceLocale(imp.sourceId)).catch(() => {});
  else await supprimerCloudinary(imp.sourceId, "raw", "private");
}

async function avecReprises<T>(fn: () => Promise<T>, essais = 3): Promise<T> {
  let derniere: unknown;
  for (let i = 0; i < essais; i++) {
    try {
      return await fn();
    } catch (e) {
      derniere = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw derniere;
}

/**
 * Enregistre une image extraite. Identifiant déterministe (import + image) et pas d'écrasement :
 * relancer un import ne crée pas de doublon sur Cloudinary.
 */
export async function enregistrerImage(mode: ModeStockage, importId: string, imageId: string, fichier: Buffer, format: "jpeg" | "png") {
  if (mode === "local") {
    const dossier = path.join(process.cwd(), "public", "uploads", "imports", importId);
    await mkdir(dossier, { recursive: true });
    const nom = `${imageId}.${format === "png" ? "png" : "jpg"}`;
    await writeFile(path.join(dossier, nom), fichier);
    return { url: `/uploads/imports/${importId}/${nom}`, publicId: `local/imports/${importId}/${nom}` };
  }
  const blob = new Blob([new Uint8Array(fichier)], { type: format === "png" ? "image/png" : "image/jpeg" });
  const r = await avecReprises(() =>
    envoyerCloudinary(blob, { resourceType: "image", folder: `${dossierCloudinary()}/imports/${importId}`, publicId: imageId, overwrite: false }),
  );
  return { url: r.url, publicId: r.publicId };
}

export async function supprimerImage(publicId: string) {
  if (publicId.startsWith("local/")) {
    await unlink(path.join(process.cwd(), "public", "uploads", publicId.replace(/^local\//, ""))).catch(() => {});
    return;
  }
  await supprimerCloudinary(publicId, "image").catch((e) => console.error("Suppression d'image Cloudinary :", e));
}

export async function supprimerDossierImagesLocal(importId: string) {
  await rm(path.join(process.cwd(), "public", "uploads", "imports", importId), { recursive: true, force: true });
}
