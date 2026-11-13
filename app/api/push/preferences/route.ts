// Préférences de notification d'un abonnement push. Le site n'a pas de comptes lecteurs : l'adresse
// de l'abonnement (endpoint, secrète et propre à l'appareil) sert d'identifiant.
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ZONES } from "@/lib/veille/defauts";

const ZONES_VALIDES = Object.keys(ZONES).filter((z) => z !== "NON_PRECISE") as [string, ...string[]];
const Lire = z.object({ endpoint: z.string().url().max(1000) });
const Ecrire = z.object({
  endpoint: z.string().url().max(1000),
  langue: z.enum(["fr", "en"]).optional(),
  articles: z.boolean(),
  veille: z.boolean(),
  categories: z.array(z.string().max(60)).max(30),
  zones: z.array(z.enum(ZONES_VALIDES)).max(10),
});

const SELECTION = { articles: true, veille: true, categoriesVeille: true, zonesVeille: true, langue: true } as const;

/** Lecture des préférences (POST : l'adresse de l'abonnement ne doit pas apparaître dans les URL). */
export async function POST(request: Request) {
  const p = Lire.safeParse(await request.json().catch(() => null));
  if (!p.success) return Response.json({ erreur: "Demande invalide." }, { status: 400 });
  const ab = await prisma.abonnementPush.findUnique({ where: { endpoint: p.data.endpoint }, select: SELECTION });
  if (!ab) return Response.json({ erreur: "Abonnement inconnu." }, { status: 404 });
  return Response.json(ab, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const p = Ecrire.safeParse(await request.json().catch(() => null));
  if (!p.success) return Response.json({ erreur: "Préférences invalides." }, { status: 400 });
  const d = p.data;
  const connues = new Set((await prisma.categorieVeille.findMany({ select: { slug: true } })).map((c) => c.slug));
  const r = await prisma.abonnementPush.updateMany({
    where: { endpoint: d.endpoint },
    data: {
      articles: d.articles,
      veille: d.veille,
      categoriesVeille: [...new Set(d.categories.filter((c) => connues.has(c)))],
      zonesVeille: [...new Set(d.zones)] as never,
      ...(d.langue ? { langue: d.langue } : {}),
    },
  });
  if (!r.count) return Response.json({ erreur: "Abonnement inconnu : réactivez les notifications." }, { status: 404 });
  return Response.json({ ok: true });
}
