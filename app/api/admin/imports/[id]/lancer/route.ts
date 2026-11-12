// Lance (ou relance) le traitement d'un import en arrière-plan : la réponse est immédiate et le
// traitement continue après elle (after), dans la limite de durée de la fonction (300 s).
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin, journaliser } from "@/lib/admin";
import { traiterImport } from "@/lib/import-pdf/traitement";

export const maxDuration = 300;

export async function POST(_request: Request, { params }: RouteContext<"/api/admin/imports/[id]/lancer">) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const imp = await prisma.importPdf.findUnique({ where: { id }, select: { statut: true, sourceSupprimee: true, tentatives: true } });
  if (!imp) return Response.json({ erreur: "Import introuvable." }, { status: 404 });
  if (imp.sourceSupprimee) {
    return Response.json({ erreur: "Le PDF source a été supprimé (durée de conservation dépassée) : importez-le de nouveau." }, { status: 410 });
  }
  if (imp.tentatives >= 5) {
    return Response.json({ erreur: "Trop de tentatives pour ce fichier : vérifiez le PDF avant de réessayer." }, { status: 429 });
  }
  const r = await prisma.importPdf.updateMany({
    where: { id, statut: { in: ["TELEVERSE", "ECHEC", "A_VERIFIER"] } },
    data: { statut: "EN_ATTENTE", etape: "En file d'attente", progression: 0, erreur: null, debutTraitement: null },
  });
  if (!r.count) return Response.json({ erreur: "Cet import est déjà en cours de traitement ou terminé." }, { status: 409 });
  if (imp.statut !== "TELEVERSE") await journaliser(admin.id, "IMPORT_PDF_RELANCE", "ImportPdf", id);
  after(() => traiterImport(id));
  return Response.json({ ok: true }, { status: 202 });
}
