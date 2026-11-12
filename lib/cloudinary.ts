// Accès Cloudinary côté serveur uniquement (signature des requêtes avec le secret).
// Utilisé par la médiathèque (/api/admin/upload) et par l'importation de PDF.
import "server-only";
import { createHash } from "node:crypto";

export function cloudinaryActif() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function dossierCloudinary() {
  return process.env.CLOUDINARY_FOLDER || "diwaa-magazine";
}

function config() {
  return {
    cloud: process.env.CLOUDINARY_CLOUD_NAME!,
    cle: process.env.CLOUDINARY_API_KEY!,
    secret: process.env.CLOUDINARY_API_SECRET!,
  };
}

/** Signature Cloudinary : paramètres triés « a=1&b=2 » suivis du secret, hachés en SHA-1. */
export function signer(params: Record<string, string | number | boolean>) {
  const chaine = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(chaine + config().secret).digest("hex");
}

const maintenant = () => Math.floor(Date.now() / 1000);

type ResultatEnvoi = { secure_url: string; public_id: string; width?: number; height?: number; existing?: boolean };

/** Envoi signé d'un fichier (Blob) ; `resourceType` = image | video | raw | auto. */
export async function envoyerCloudinary(
  fichier: Blob,
  options: { resourceType?: "image" | "video" | "raw" | "auto"; publicId?: string; folder?: string; type?: "upload" | "private"; overwrite?: boolean } = {},
) {
  const { cloud, cle } = config();
  const params: Record<string, string | number | boolean> = { timestamp: maintenant() };
  if (options.folder) params.folder = options.folder;
  if (options.publicId) params.public_id = options.publicId;
  if (options.type) params.type = options.type;
  if (options.overwrite !== undefined) params.overwrite = options.overwrite;
  const corps = new FormData();
  corps.set("file", fichier);
  for (const [k, v] of Object.entries(params)) corps.set(k, String(v));
  corps.set("api_key", cle);
  corps.set("signature", signer(params));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${options.resourceType ?? "auto"}/upload`, { method: "POST", body: corps });
  if (!res.ok) throw new Error(`Cloudinary : ${res.status} ${await res.text()}`);
  const d = (await res.json()) as ResultatEnvoi;
  return { url: d.secure_url, publicId: d.public_id, largeur: d.width ?? null, hauteur: d.height ?? null };
}

/** Paramètres d'un envoi direct navigateur → Cloudinary (fichier brut privé), signés par le serveur. */
export function parametresEnvoiDirectPrive(publicId: string) {
  const { cloud, cle } = config();
  const params = { public_id: publicId, timestamp: maintenant(), type: "private" };
  return {
    url: `https://api.cloudinary.com/v1_1/${cloud}/raw/upload`,
    champs: { ...params, timestamp: String(params.timestamp), api_key: cle, signature: signer(params) },
  };
}

/** URL de téléchargement temporaire d'un fichier brut privé (valable `dureeS` secondes). */
export function urlTelechargementPrive(publicId: string, dureeS = 600) {
  const { cloud, cle } = config();
  const params = { public_id: publicId, type: "private", timestamp: maintenant(), expires_at: maintenant() + dureeS };
  const q = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: cle, signature: signer(params) });
  return `https://api.cloudinary.com/v1_1/${cloud}/raw/download?${q}`;
}

/** Suppression d'une ressource ; ne lève pas d'erreur si elle n'existe plus. */
export async function supprimerCloudinary(publicId: string, resourceType: "image" | "raw" = "image", type: "upload" | "private" = "upload") {
  const { cloud, cle } = config();
  const params = { public_id: publicId, timestamp: maintenant(), type, invalidate: true };
  const corps = new FormData();
  for (const [k, v] of Object.entries(params)) corps.set(k, String(v));
  corps.set("api_key", cle);
  corps.set("signature", signer(params));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/destroy`, { method: "POST", body: corps });
  if (!res.ok) throw new Error(`Cloudinary (suppression) : ${res.status} ${await res.text()}`);
}
