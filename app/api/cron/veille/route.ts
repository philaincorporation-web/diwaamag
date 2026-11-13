// Collecte planifiée de la Veille Média (Vercel Cron ou service externe type cron-job.org),
// protégée par l'en-tête « Authorization: Bearer CRON_SECRET ».
import { collecterVeille } from "@/lib/veille/collecte";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const bilan = await collecterVeille();
  return Response.json(bilan);
}
