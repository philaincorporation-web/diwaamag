// Clic sur une publicité : compté, puis redirection vers le site de l'annonceur.
import { prisma } from "@/lib/db";

const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp/i;

export async function GET(request: Request, { params }: RouteContext<"/api/pub/[id]/clic">) {
  const { id } = await params;
  const pub = await prisma.publicite.findUnique({ where: { id }, select: { lien: true } });
  const accueil = new URL("/", request.url);
  if (!pub) return Response.redirect(accueil, 302);
  if (!ROBOT.test(request.headers.get("user-agent") ?? "")) {
    await prisma.publicite.update({ where: { id }, data: { clics: { increment: 1 } } }).catch(() => {});
  }
  // Seuls les liens web sont suivis (jamais javascript:, data:…).
  const cible = /^https?:\/\//i.test(pub.lien) ? pub.lien : accueil.toString();
  return new Response(null, { status: 302, headers: { Location: cible, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
