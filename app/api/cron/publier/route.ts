// Publication des articles programmés. Appelée par Vercel Cron (vercel.json) avec l'en-tête
// « Authorization: Bearer CRON_SECRET ».
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/data";
import { notifierNouvelArticle } from "@/lib/services";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const maintenant = new Date();
  const dus = await prisma.article.findMany({
    where: { statut: "PROGRAMME", dateProgrammee: { lte: maintenant } },
    select: { id: true, titre: true, slug: true, chapeau: true, imageUneUrl: true, dateProgrammee: true, auteurId: true },
  });
  for (const a of dus) {
    await prisma.article.update({
      where: { id: a.id },
      data: { statut: "PUBLIE", datePublication: a.dateProgrammee ?? maintenant, dateMiseAJour: a.dateProgrammee ?? maintenant },
    });
    await prisma.journalActivite.create({
      data: { adminId: a.auteurId, action: "PUBLICATION_PROGRAMMEE", cible: "Article", cibleId: a.id, details: { titre: a.titre } },
    });
    revalidateTag(TAGS.article(a.slug), { expire: 0 });
    await notifierNouvelArticle(a);
  }
  if (dus.length) revalidateTag(TAGS.articles, { expire: 0 });
  return Response.json({ publies: dus.length });
}
