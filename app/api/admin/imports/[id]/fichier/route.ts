// Réception du PDF en développement local (sans Cloudinary). En production, modeStockage() impose
// Cloudinary : aucun import « local » ne peut y être créé, cette route répond donc 404.
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { IMPORT_PDF } from "@/lib/import-pdf/config";
import { ErreurImport, verifierSignaturePdf } from "@/lib/import-pdf/extraction";
import { enregistrerSourceLocale } from "@/lib/import-pdf/stockage";

export async function PUT(request: Request, { params }: RouteContext<"/api/admin/imports/[id]/fichier">) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const imp = await prisma.importPdf.findUnique({ where: { id } });
  if (!imp || imp.stockage !== "local" || imp.statut !== "TELEVERSE") return Response.json({ erreur: "Import introuvable." }, { status: 404 });
  const octets = new Uint8Array(await request.arrayBuffer());
  if (!octets.byteLength || octets.byteLength > IMPORT_PDF.tailleMaxMo * 1024 * 1024) {
    return Response.json({ erreur: "Taille de fichier invalide." }, { status: 413 });
  }
  try {
    verifierSignaturePdf(octets);
  } catch (e) {
    return Response.json({ erreur: e instanceof ErreurImport ? e.message : "Fichier invalide." }, { status: 415 });
  }
  await enregistrerSourceLocale(id, octets);
  return Response.json({ ok: true });
}
