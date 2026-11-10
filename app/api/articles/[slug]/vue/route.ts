// Compteur de lectures anonyme (appelé par navigator.sendBeacon). Le classement « Les plus lus »
// se met à jour avec la durée de vie du cache (cacheLife « hours »), sans invalidation à chaque vue.
import { prisma } from "@/lib/db";

export async function POST(_: Request, ctx: RouteContext<"/api/articles/[slug]/vue">) {
  const { slug } = await ctx.params;
  await prisma.article.updateMany({ where: { slug, statut: "PUBLIE" }, data: { vues: { increment: 1 } } });
  return new Response(null, { status: 204 });
}
