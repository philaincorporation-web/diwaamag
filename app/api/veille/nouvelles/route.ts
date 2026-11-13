// Nombre d'actualités de veille arrivées depuis une date (page Veille Média ouverte : bandeau
// « nouvelles actualités » et son de notification dans l'application).
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const depuis = new Date(new URL(request.url).searchParams.get("depuis") ?? "");
  if (Number.isNaN(depuis.getTime())) return Response.json({ nombre: 0 });
  const nouvelles = await prisma.actualiteVeille.findMany({
    where: { masquee: false, creeLe: { gt: depuis } },
    orderBy: { creeLe: "desc" },
    take: 3,
    select: { titre: true, creeLe: true },
  });
  const nombre = nouvelles.length ? await prisma.actualiteVeille.count({ where: { masquee: false, creeLe: { gt: depuis } } }) : 0;
  return Response.json({ nombre, titres: nouvelles.map((n) => n.titre), plusRecente: nouvelles[0]?.creeLe ?? null }, { headers: { "Cache-Control": "no-store" } });
}
