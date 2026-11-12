// Création d'un import de PDF : contrôle des limites, détection des doublons (empreinte SHA-256),
// puis autorisation signée d'envoi direct navigateur → Cloudinary (le fichier ne transite pas par
// la fonction serveur, limitée à 4,5 Mo sur Vercel). En développement sans Cloudinary : envoi local.
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdmin, journaliser } from "@/lib/admin";
import { parametresEnvoiDirectPrive } from "@/lib/cloudinary";
import { IMPORT_PDF } from "@/lib/import-pdf/config";
import { ErreurImport } from "@/lib/import-pdf/extraction";
import { idSourceCloudinary, modeStockage } from "@/lib/import-pdf/stockage";
import { libererTraitementsBloques } from "@/lib/import-pdf/traitement";

const Demande = z.object({
  nom: z.string().trim().min(1).max(200),
  taille: z.number().int().positive(),
  empreinte: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ erreur: "Non autorisé" }, { status: 401 });
  const d = Demande.safeParse(await request.json().catch(() => null));
  if (!d.success) return Response.json({ erreur: "Demande invalide." }, { status: 400 });
  if (d.data.taille > IMPORT_PDF.tailleMaxMo * 1024 * 1024) {
    return Response.json(
      { erreur: `Fichier trop volumineux : ${IMPORT_PDF.tailleMaxMo} Mo maximum. Réduisez sa taille (export « qualité écran » ou compression).` },
      { status: 413 },
    );
  }

  await libererTraitementsBloques();
  const existant = await prisma.importPdf.findFirst({
    where: { empreinte: d.data.empreinte, statut: { notIn: ["ECHEC", "ANNULE"] } },
    orderBy: { creeLe: "desc" },
    select: { id: true, statut: true },
  });
  // Même fichier déjà importé (et pas seulement en cours d'envoi) : on renvoie vers l'import existant.
  if (existant && existant.statut !== "TELEVERSE") return Response.json({ id: existant.id, existant: true });

  let mode;
  try {
    mode = modeStockage();
  } catch (e) {
    return Response.json({ erreur: e instanceof ErreurImport ? e.message : "Stockage indisponible." }, { status: 503 });
  }
  // Nom affiché uniquement : jamais utilisé comme chemin de fichier.
  const nomFichier = d.data.nom.replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 150) || "document.pdf";
  const imp = existant
    ? await prisma.importPdf.findUniqueOrThrow({ where: { id: existant.id } })
    : await prisma.importPdf.create({
        data: {
          nomFichier,
          taille: d.data.taille,
          empreinte: d.data.empreinte,
          stockage: mode,
          sourceId: "",
          expireLe: new Date(Date.now() + IMPORT_PDF.conservationJours * 86_400_000),
          adminId: admin.id,
        },
      });
  const sourceId = mode === "cloudinary" ? idSourceCloudinary(imp.id) : `${imp.id}.pdf`;
  if (imp.sourceId !== sourceId || imp.stockage !== mode) await prisma.importPdf.update({ where: { id: imp.id }, data: { sourceId, stockage: mode } });
  if (!existant) await journaliser(admin.id, "IMPORT_PDF", "ImportPdf", imp.id, { fichier: nomFichier });

  const envoi = mode === "cloudinary" ? { mode, ...parametresEnvoiDirectPrive(sourceId) } : { mode, url: `/api/admin/imports/${imp.id}/fichier` };
  return Response.json({ id: imp.id, envoi }, { status: 201 });
}
