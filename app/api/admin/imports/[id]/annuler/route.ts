// Annulation d'un import non terminé : le traitement s'arrête à l'étape suivante, le PDF source et
// les images déjà envoyées sont supprimés.
import { prisma } from "@/lib/db";
import { getAdmin, journaliser } from "@/lib/admin";
import { ResultatImportSchema } from "@/lib/import-pdf/schema";
import { supprimerDossierImagesLocal, supprimerImage, supprimerSource } from "@/lib/import-pdf/stockage";

export async function POST(_request: Request, { params }: RouteContext<"/api/admin/imports/[id]/annuler">) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.importPdf.updateMany({
    where: { id, statut: { in: ["TELEVERSE", "EN_ATTENTE", "EN_COURS", "A_VERIFIER", "ECHEC"] } },
    data: { statut: "ANNULE", etape: null },
  });
  if (!r.count) return Response.json({ erreur: "Cet import ne peut plus être annulé." }, { status: 409 });
  const imp = await prisma.importPdf.findUniqueOrThrow({ where: { id } });
  if (imp.sourceId) await supprimerSource(imp).catch((e) => console.error("Suppression du PDF source :", e));
  const resultat = ResultatImportSchema.safeParse(imp.resultat);
  if (resultat.success) for (const img of resultat.data.images) await supprimerImage(img.publicId);
  if (imp.stockage === "local") await supprimerDossierImagesLocal(id);
  await prisma.importPdf.update({ where: { id }, data: { sourceSupprimee: true } });
  await journaliser(admin.id, "IMPORT_PDF_ANNULE", "ImportPdf", id, { fichier: imp.nomFichier });
  return Response.json({ ok: true });
}
