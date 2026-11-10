// Services externes : e-mails (Resend), anti-spam (Cloudflare Turnstile), notifications push (VAPID).
// Chaque service se désactive proprement si ses variables d'environnement sont absentes.
import "server-only";
import { Resend } from "resend";
import { sendNotification, setVapidDetails } from "web-push";
import { prisma } from "@/lib/db";

const expediteur = process.env.EMAIL_FROM || "DIWA MAG <redaction@diwaamagazine.com>";

export async function envoyerEmail({ a, sujet, html }: { a: string | string[]; sujet: string; html: string }) {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.info(`[e-mail non envoyé — RESEND_API_KEY absente] À : ${a} — ${sujet}`);
    return { ok: false as const };
  }
  const resend = new Resend(cle);
  const { error } = await resend.emails.send({ from: expediteur, to: a, subject: sujet, html });
  if (error) console.error("Envoi d'e-mail impossible :", error);
  return { ok: !error };
}

export function turnstileActif() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function verifierTurnstile(jeton: string | null | undefined, ip?: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Non configuré : on s'appuie sur le pot de miel et la limitation de débit.
  if (!jeton) return false;
  const corps = new URLSearchParams({ secret, response: jeton });
  if (ip) corps.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: corps });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

function configurerPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  setVapidDetails(process.env.VAPID_SUBJECT || "mailto:redaction@diwaamagazine.com", pub, priv);
  return true;
}

/** Envoie une notification push à tous les abonnés ; supprime les abonnements expirés. */
export async function notifierNouvelArticle(article: { titre: string; slug: string; chapeau: string; imageUneUrl: string | null }) {
  if (!configurerPush()) return { envoyes: 0 };
  const abonnements = await prisma.abonnementPush.findMany();
  const charge = JSON.stringify({
    title: article.titre,
    body: article.chapeau.slice(0, 140),
    url: `/fr/article/${article.slug}`,
    image: article.imageUneUrl,
  });
  let envoyes = 0;
  await Promise.all(
    abonnements.map(async (a) => {
      try {
        await sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge);
        envoyes++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await prisma.abonnementPush.delete({ where: { id: a.id } }).catch(() => {});
      }
    }),
  );
  return { envoyes };
}

/** Échappe une chaîne pour l'insérer dans un e-mail HTML. */
export function echapper(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
