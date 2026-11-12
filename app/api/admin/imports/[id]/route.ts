// État d'un import, interrogé régulièrement par la page de suivi.
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { libererTraitementsBloques } from "@/lib/import-pdf/traitement";

export async function GET(_request: Request, { params }: RouteContext<"/api/admin/imports/[id]">) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  await libererTraitementsBloques();
  const imp = await prisma.importPdf.findUnique({ where: { id }, select: { statut: true, etape: true, progression: true, erreur: true, pages: true } });
  if (!imp) return Response.json({ erreur: "Import introuvable." }, { status: 404 });
  return Response.json(imp, { headers: { "Cache-Control": "no-store" } });
}
