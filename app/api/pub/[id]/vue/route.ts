// Affichage d'une publicité (envoyé par le navigateur quand la bannière devient visible à l'écran).
import { prisma } from "@/lib/db";

const ROBOT = /bot|crawl|spider|slurp|preview|headless/i;

export async function POST(request: Request, { params }: RouteContext<"/api/pub/[id]/vue">) {
  const { id } = await params;
  if (!ROBOT.test(request.headers.get("user-agent") ?? "")) {
    await prisma.publicite.updateMany({ where: { id }, data: { affichages: { increment: 1 } } }).catch(() => {});
  }
  return new Response(null, { status: 204 });
}
