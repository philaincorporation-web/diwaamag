// Téléversement d'un média (image, vidéo, PDF) vers Cloudinary, puis enregistrement dans la bibliothèque (Media).
// Sans configuration Cloudinary, et uniquement en développement, le fichier est écrit dans public/uploads.
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getAdmin, journaliser } from "@/lib/admin";
import type { TypeMedia } from "@/lib/generated/prisma/client";

const TAILLE_MAX = 25 * 1024 * 1024;
const TYPES: Record<string, TypeMedia> = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
  "image/avif": "IMAGE",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "application/pdf": "PDF",
};

async function versCloudinary(fichier: File) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const cle = process.env.CLOUDINARY_API_KEY!;
  const secret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = process.env.CLOUDINARY_FOLDER || "diwaa-magazine";
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  const corps = new FormData();
  corps.set("file", fichier);
  corps.set("api_key", cle);
  corps.set("timestamp", timestamp);
  corps.set("folder", folder);
  corps.set("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: "POST", body: corps });
  if (!res.ok) throw new Error(`Cloudinary : ${res.status} ${await res.text()}`);
  const d = (await res.json()) as { secure_url: string; public_id: string; width?: number; height?: number };
  return { url: d.secure_url, publicId: d.public_id, largeur: d.width ?? null, hauteur: d.height ?? null };
}

async function versDossierLocal(fichier: File) {
  const ext = path.extname(fichier.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  const nom = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const dossier = path.join(process.cwd(), "public", "uploads");
  await mkdir(dossier, { recursive: true });
  await writeFile(path.join(dossier, nom), Buffer.from(await fichier.arrayBuffer()));
  return { url: `/uploads/${nom}`, publicId: `local/${nom}`, largeur: null, hauteur: null };
}

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ erreur: "Non autorisé" }, { status: 401 });

  const form = await request.formData();
  const fichier = form.get("fichier");
  const texteAlternatif = String(form.get("texteAlternatif") || "").trim();
  const legende = String(form.get("legende") || "").trim() || null;
  if (!(fichier instanceof File)) return Response.json({ erreur: "Aucun fichier reçu." }, { status: 400 });
  const type = TYPES[fichier.type];
  if (!type) return Response.json({ erreur: "Format non pris en charge (JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, PDF)." }, { status: 415 });
  if (fichier.size > TAILLE_MAX) return Response.json({ erreur: "Fichier trop volumineux (25 Mo maximum)." }, { status: 413 });
  if (type === "IMAGE" && texteAlternatif.length < 3) {
    return Response.json({ erreur: "Le texte alternatif est obligatoire pour les images." }, { status: 400 });
  }

  const cloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  if (!cloudinary && process.env.NODE_ENV === "production") {
    return Response.json({ erreur: "Stockage des médias non configuré (variables CLOUDINARY_*)." }, { status: 503 });
  }
  try {
    const r = cloudinary ? await versCloudinary(fichier) : await versDossierLocal(fichier);
    const media = await prisma.media.create({
      data: { ...r, type, legende, texteAlternatif: texteAlternatif || fichier.name, ajouteParId: admin.id },
    });
    await journaliser(admin.id, "TELEVERSEMENT", "Media", media.id, { nom: fichier.name, type });
    return Response.json({ media }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ erreur: "Le téléversement a échoué." }, { status: 502 });
  }
}
