// Abonnements aux notifications push (modèle AbonnementPush).
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  langue: z.enum(["fr", "en"]).optional(),
  /** Abonnement créé depuis les préférences de la Veille Média : la veille est activée d'emblée. */
  veille: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erreur: "Abonnement invalide" }, { status: 400 });
  const { endpoint, keys, langue, veille } = parsed.data;
  await prisma.abonnementPush.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, ...(langue ? { langue } : {}) },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, langue: langue ?? "fr", veille: veille ?? false },
  });
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) await prisma.abonnementPush.deleteMany({ where: { endpoint: body.endpoint } });
  return new Response(null, { status: 204 });
}
