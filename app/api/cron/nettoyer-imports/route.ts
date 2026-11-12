// Nettoyage quotidien des imports de PDF (Vercel Cron, en-tête « Authorization: Bearer CRON_SECRET ») :
// - suppression des PDF sources arrivés au terme de leur durée de conservation ;
// - suppression des images des imports jamais transformés en article ;
// - libération des traitements bloqués.
import { prisma } from "@/lib/db";
import { ResultatImportSchema } from "@/lib/import-pdf/schema";
import { supprimerDossierImagesLocal, supprimerImage, supprimerSource } from "@/lib/import-pdf/stockage";
import { libererTraitementsBloques } from "@/lib/import-pdf/traitement";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  await libererTraitementsBloques();
  const expires = await prisma.importPdf.findMany({ where: { expireLe: { lt: new Date() }, sourceSupprimee: false } });
  let sources = 0;
  let images = 0;
  for (const imp of expires) {
    try {
      if (imp.sourceId) await supprimerSource(imp);
      sources++;
    } catch (e) {
      console.error(`Nettoyage de l'import ${imp.id} :`, e);
      continue;
    }
    // Import jamais validé : ses images n'appartiennent à aucun article.
    if (imp.statut !== "TERMINE") {
      const r = ResultatImportSchema.safeParse(imp.resultat);
      if (r.success) {
        for (const img of r.data.images) {
          await supprimerImage(img.publicId);
          images++;
        }
      }
      if (imp.stockage === "local") await supprimerDossierImagesLocal(imp.id);
    }
    await prisma.importPdf.update({
      where: { id: imp.id },
      data: {
        sourceSupprimee: true,
        ...(imp.statut === "TERMINE" ? {} : { statut: "ANNULE", etape: null, erreur: "Expiré : non validé dans le délai de conservation." }),
      },
    });
  }
  return Response.json({ sourcesSupprimees: sources, imagesSupprimees: images });
}
