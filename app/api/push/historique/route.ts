// Historique des notifications de veille reçues par un abonnement (30 dernières).
import { z } from "zod";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const p = z.object({ endpoint: z.string().url().max(1000) }).safeParse(await request.json().catch(() => null));
  if (!p.success) return Response.json({ erreur: "Demande invalide." }, { status: 400 });
  const ab = await prisma.abonnementPush.findUnique({ where: { endpoint: p.data.endpoint }, select: { id: true } });
  if (!ab) return Response.json([], { headers: { "Cache-Control": "no-store" } });
  const liste = await prisma.notificationVeille.findMany({
    where: { abonnementId: ab.id, envoyee: true },
    orderBy: { creeLe: "desc" },
    take: 30,
    select: { creeLe: true, actualite: { select: { id: true, titre: true, masquee: true, source: { select: { nom: true } } } } },
  });
  return Response.json(
    liste.filter((n) => !n.actualite.masquee).map((n) => ({ id: n.actualite.id, titre: n.actualite.titre, source: n.actualite.source.nom, date: n.creeLe })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
