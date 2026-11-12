"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/data";
import { echapper, envoyerEmail, verifierTurnstile } from "@/lib/services";
import { siteUrl } from "@/lib/format";
import { estLangue, type Langue } from "@/lib/i18n";

export type EtatFormulaire = { ok: boolean; message: string; erreurs?: Record<string, string> } | null;

const MESSAGES = {
  fr: {
    nomCourt: "Indiquez votre nom (2 caractères minimum).",
    emailInvalide: "Adresse e-mail invalide.",
    messageCourt: "Votre message est trop court.",
    messageLong: "Votre message est trop long.",
    lienInvalide: "Le lien doit commencer par http:// ou https://",
    consentement: "Merci d'accepter la politique de confidentialité.",
    corriger: "Merci de corriger les champs indiqués.",
    antispam: "La vérification anti-spam a échoué. Merci de réessayer.",
    tropDeMessages: "Vous avez publié plusieurs commentaires récemment. Merci de patienter quelques minutes.",
    articleFerme: "Cet article n'accepte pas de commentaires.",
    commentairePublie: "Merci ! Votre commentaire est publié.",
    commentaireLien: "Merci ! Votre commentaire et votre lien seront publiés après validation par la rédaction.",
    commentairePremier: "Merci ! Votre premier commentaire sera publié après validation par la rédaction.",
    recu: "Merci ! Votre commentaire a bien été reçu.",
    dejaInscrit: "Vous êtes déjà inscrit·e à la newsletter. Merci de votre fidélité !",
    presque: "Presque fini ! Cliquez sur le lien de confirmation envoyé par e-mail.",
    sujetCourt: "Indiquez un sujet.",
    contactEnvoye: "Merci, votre message a été transmis à la rédaction.",
    organisationCourte: "Indiquez votre entreprise ou organisation.",
    annonceurEnvoye: "Merci ! Votre demande a été transmise à notre service commercial, qui vous répondra sous 48 heures ouvrées.",
    contactErreur: "L'envoi est momentanément indisponible. Écrivez-nous directement à redaction@digiewomen.com.",
    sujetNewsletter: "Confirmez votre inscription à la newsletter DIWA MAG",
    corpsNewsletter: [
      "Bienvenue dans la communauté DIWA MAG",
      "Pour recevoir chaque mois l'actualité du numérique au Gabon, en Afrique et dans le monde, confirmez votre adresse :",
      "Confirmer mon inscription",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.",
    ],
  },
  en: {
    nomCourt: "Please enter your name (at least 2 characters).",
    emailInvalide: "Invalid email address.",
    messageCourt: "Your message is too short.",
    messageLong: "Your message is too long.",
    lienInvalide: "The link must start with http:// or https://",
    consentement: "Please accept the privacy policy.",
    corriger: "Please correct the highlighted fields.",
    antispam: "The anti-spam check failed. Please try again.",
    tropDeMessages: "You have posted several comments recently. Please wait a few minutes.",
    articleFerme: "This article does not accept comments.",
    commentairePublie: "Thank you! Your comment has been published.",
    commentaireLien: "Thank you! Your comment and link will be published once approved by the editorial team.",
    commentairePremier: "Thank you! Your first comment will be published once approved by the editorial team.",
    recu: "Thank you! Your comment has been received.",
    dejaInscrit: "You are already subscribed to the newsletter. Thank you for your loyalty!",
    presque: "Almost there! Click the confirmation link we just emailed you.",
    sujetCourt: "Please enter a subject.",
    contactEnvoye: "Thank you, your message has been sent to the editorial team.",
    organisationCourte: "Please enter your company or organisation.",
    annonceurEnvoye: "Thank you! Your request has been sent to our sales team, who will reply within 2 business days.",
    contactErreur: "Sending is temporarily unavailable. Please email us at redaction@digiewomen.com.",
    sujetNewsletter: "Confirm your DIWA MAG newsletter subscription",
    corpsNewsletter: [
      "Welcome to the DIWA MAG community",
      "To receive monthly digital news from Gabon, Africa and the world, please confirm your email address:",
      "Confirm my subscription",
      "If you did not request this, simply ignore this message.",
    ],
  },
} as const;

function langueDe(formData: FormData): Langue {
  const l = formData.get("langue");
  return estLangue(l) ? l : "fr";
}

async function adresseIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

function erreursDe(e: z.ZodError) {
  const erreurs: Record<string, string> = {};
  for (const issue of e.issues) erreurs[String(issue.path[0])] = issue.message;
  return erreurs;
}

function schemaCommentaire(m: (typeof MESSAGES)[Langue]) {
  return z.object({
    articleId: z.string().min(1),
    parentId: z.string().optional().transform((v) => v || undefined),
    nom: z.string().trim().min(2, m.nomCourt).max(80),
    email: z.string().trim().toLowerCase().email(m.emailInvalide),
    message: z.string().trim().min(3, m.messageCourt).max(3000, m.messageLong),
    lien: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => v || undefined)
      .refine((v) => !v || /^https?:\/\//i.test(v), m.lienInvalide),
    consentement: z.literal("on", { message: m.consentement }),
  });
}

export async function publierCommentaire(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const lang = langueDe(formData);
  const m = MESSAGES[lang];
  // Pot de miel : champ invisible rempli uniquement par les robots.
  if (formData.get("site_web")) return { ok: true, message: m.recu };

  const parsed = schemaCommentaire(m).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: m.corriger, erreurs: erreursDe(parsed.error) };
  const d = parsed.data;
  const ip = await adresseIp();

  if (!(await verifierTurnstile(formData.get("cf-turnstile-response") as string | null, ip))) {
    return { ok: false, message: m.antispam };
  }

  // Limitation : 3 commentaires par adresse IP ou e-mail toutes les 10 minutes.
  const recents = await prisma.commentaire.count({
    where: { creeLe: { gte: new Date(Date.now() - 10 * 60_000) }, OR: [{ email: d.email }, ...(ip ? [{ adresseIp: ip }] : [])] },
  });
  if (recents >= 3) return { ok: false, message: m.tropDeMessages };

  const article = await prisma.article.findFirst({ where: { id: d.articleId, statut: "PUBLIE" }, select: { id: true, titre: true } });
  if (!article) return { ok: false, message: m.articleFerme };

  // Premier commentaire d'une adresse : validation manuelle. Ensuite : publication directe,
  // sauf si un lien est joint (les liens sont toujours modérés).
  const dejaApprouve = await prisma.commentaire.count({ where: { email: d.email, statut: "APPROUVE" } });
  const statut = dejaApprouve > 0 && !d.lien ? "APPROUVE" : "EN_ATTENTE";

  await prisma.commentaire.create({
    data: { articleId: article.id, parentId: d.parentId, nom: d.nom, email: d.email, message: d.message, lien: d.lien, statut, adresseIp: ip },
  });

  if (statut === "APPROUVE") {
    updateTag(TAGS.commentaires(article.id));
    return { ok: true, message: m.commentairePublie };
  }

  const notif = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (notif) {
    await envoyerEmail({
      a: notif,
      sujet: `Nouveau commentaire à modérer — ${article.titre}`,
      html: `<p><strong>${echapper(d.nom)}</strong> a commenté « ${echapper(article.titre)} » :</p><blockquote>${echapper(d.message)}</blockquote><p><a href="${siteUrl("/admin/commentaires")}">Ouvrir la file de modération</a></p>`,
    });
  }
  return { ok: true, message: d.lien ? m.commentaireLien : m.commentairePremier };
}

export async function signalerCommentaire(commentaireId: string): Promise<{ ok: boolean }> {
  const c = await prisma.commentaire.update({
    where: { id: commentaireId },
    data: { signalements: { increment: 1 } },
    select: { signalements: true, articleId: true, statut: true },
  });
  // Au troisième signalement, le commentaire est retiré en attendant l'examen d'un administrateur.
  if (c.signalements >= 3 && c.statut === "APPROUVE") {
    await prisma.commentaire.update({ where: { id: commentaireId }, data: { statut: "SIGNALE" } });
    updateTag(TAGS.commentaires(c.articleId));
  }
  return { ok: true };
}

export async function inscrireNewsletter(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const lang = langueDe(formData);
  const m = MESSAGES[lang];
  if (formData.get("site_web")) return { ok: true, message: m.presque };
  const parsed = z.string().trim().toLowerCase().email(m.emailInvalide).safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const email = parsed.data;

  const existant = await prisma.abonneNewsletter.findUnique({ where: { email } });
  if (existant?.confirme && !existant.desinscritLe) return { ok: true, message: m.dejaInscrit };
  const jeton = randomBytes(24).toString("hex");
  await prisma.abonneNewsletter.upsert({
    where: { email },
    update: { jetonConfirmation: jeton, desinscritLe: null, confirme: false },
    create: { email, jetonConfirmation: jeton },
  });
  const url = siteUrl(`/newsletter/confirmer?jeton=${jeton}&langue=${lang}`);
  const [titre, texte, bouton, note] = m.corpsNewsletter;
  await envoyerEmail({
    a: email,
    sujet: m.sujetNewsletter,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h1 style="font-size:22px">${titre}</h1><p>${texte}</p><p><a href="${url}" style="display:inline-block;background:#cda40e;color:#111;padding:12px 20px;text-decoration:none;font-weight:bold">${bouton}</a></p><p style="color:#666;font-size:12px">${note}</p></div>`,
  });
  return { ok: true, message: m.presque };
}

export async function envoyerContact(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const lang = langueDe(formData);
  const m = MESSAGES[lang];
  if (formData.get("site_web")) return { ok: true, message: m.contactEnvoye };
  const parsed = z
    .object({
      nom: z.string().trim().min(2, m.nomCourt).max(80),
      email: z.string().trim().email(m.emailInvalide),
      sujet: z.string().trim().min(2, m.sujetCourt).max(150),
      message: z.string().trim().min(10, m.messageCourt).max(5000, m.messageLong),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: m.corriger, erreurs: erreursDe(parsed.error) };
  if (!(await verifierTurnstile(formData.get("cf-turnstile-response") as string | null, await adresseIp()))) {
    return { ok: false, message: m.antispam };
  }
  const d = parsed.data;
  const dest = process.env.CONTACT_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || "redaction@digiewomen.com";
  const r = await envoyerEmail({
    a: dest,
    sujet: `[Contact DIWA MAG${lang === "en" ? " — EN" : ""}] ${d.sujet}`,
    html: `<p><strong>${echapper(d.nom)}</strong> (${echapper(d.email)}) écrit :</p><p>${echapper(d.message).replace(/\n/g, "<br>")}</p>`,
  });
  return r.ok ? { ok: true, message: m.contactEnvoye } : { ok: false, message: m.contactErreur };
}

const OFFRES_ANNONCEUR = ["pack-awards", "rubrique", "bannieres", "contenu-partenaire", "newsletter-whatsapp", "annonces", "video", "autre"] as const;

/** Demande d'un annonceur (page « Annonceurs ») : enregistrée pour le back-office et transmise par e-mail. */
export async function envoyerDemandeAnnonceur(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const lang = langueDe(formData);
  const m = MESSAGES[lang];
  if (formData.get("site_web")) return { ok: true, message: m.annonceurEnvoye };
  const parsed = z
    .object({
      nom: z.string().trim().min(2, m.nomCourt).max(80),
      organisation: z.string().trim().min(2, m.organisationCourte).max(120),
      email: z.string().trim().email(m.emailInvalide),
      telephone: z.string().trim().max(40).optional().transform((v) => v || null),
      offre: z.enum(OFFRES_ANNONCEUR).optional().catch(undefined),
      message: z.string().trim().min(10, m.messageCourt).max(5000, m.messageLong),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: m.corriger, erreurs: erreursDe(parsed.error) };
  if (!(await verifierTurnstile(formData.get("cf-turnstile-response") as string | null, await adresseIp()))) {
    return { ok: false, message: m.antispam };
  }
  const d = parsed.data;
  // Limite simple : 3 demandes par adresse e-mail et par heure.
  const recentes = await prisma.demandeAnnonceur.count({ where: { email: d.email, creeLe: { gt: new Date(Date.now() - 3_600_000) } } });
  if (recentes >= 3) return { ok: true, message: m.annonceurEnvoye };
  await prisma.demandeAnnonceur.create({
    data: { nom: d.nom, organisation: d.organisation, email: d.email, telephone: d.telephone, offre: d.offre ?? null, message: d.message, langue: lang },
  });
  const dest = process.env.COMMERCIAL_EMAIL || process.env.CONTACT_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || "diwamag@digiewomen.com";
  await envoyerEmail({
    a: dest,
    sujet: `[Annonceur DIWA MAG] ${d.organisation} — ${d.offre ?? "demande"}`,
    html: `<p><strong>${echapper(d.nom)}</strong> — ${echapper(d.organisation)}<br>${echapper(d.email)}${d.telephone ? ` · ${echapper(d.telephone)}` : ""}</p><p>Offre : ${echapper(d.offre ?? "non précisée")}</p><p>${echapper(d.message).replace(/\n/g, "<br>")}</p><p>À traiter dans le back-office › Publicités.</p>`,
  });
  return { ok: true, message: m.annonceurEnvoye };
}
