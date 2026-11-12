"use server";

import { randomBytes } from "node:crypto";
import { updateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { OPTIONS_TRANSACTION, prisma } from "@/lib/db";
import { TAGS } from "@/lib/data";
import { exigerAdmin, exigerSuperAdmin, journaliser } from "@/lib/admin";
import { slugify } from "@/lib/content";
import { echapper, envoyerEmail } from "@/lib/services";
import { siteUrl } from "@/lib/format";

export type Etat = { ok: boolean; message: string } | null;

function premiereErreur(e: z.ZodError) {
  return e.issues[0]?.message ?? "Données invalides.";
}

/* ───────────── Rubriques ───────────── */

const schemaRubrique = z.object({
  id: z.string().optional(),
  nom: z.string().trim().min(2, "Nom trop court.").max(60),
  description: z.string().trim().max(300).optional(),
  nomEn: z.string().trim().max(60).optional(),
  descriptionEn: z.string().trim().max(300).optional(),
  famille: z.enum(["GEOGRAPHIQUE", "THEMATIQUE"]),
  couleur: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Couleur au format #RRGGBB.").optional().or(z.literal("")),
  ordre: z.coerce.number().int().min(0).max(999).default(0),
  sponsorNom: z.string().trim().max(80).optional(),
  sponsorLien: z.string().trim().max(1000).refine((v) => !v || /^(https:\/\/|\/)/.test(v), "Adresse invalide (https://… ou /…).").optional(),
  sponsorLogoUrl: z.string().trim().max(1000).refine((v) => !v || /^(https:\/\/|\/)/.test(v), "Adresse invalide (https://… ou /…).").optional(),
});

export async function enregistrerRubrique(_: Etat, formData: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const p = schemaRubrique.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, message: premiereErreur(p.error) };
  const { id, ...d } = p.data;
  const data = {
    ...d,
    slug: slugify(d.nom),
    couleur: d.couleur || null,
    description: d.description || null,
    nomEn: d.nomEn || null,
    descriptionEn: d.descriptionEn || null,
    sponsorNom: d.sponsorNom || null,
    sponsorLien: d.sponsorNom ? d.sponsorLien || null : null,
    sponsorLogoUrl: d.sponsorNom ? d.sponsorLogoUrl || null : null,
  };
  try {
    const r = id ? await prisma.rubrique.update({ where: { id }, data }) : await prisma.rubrique.create({ data });
    await journaliser(admin.id, id ? "MODIFICATION" : "CREATION", "Rubrique", r.id, { nom: r.nom });
  } catch {
    return { ok: false, message: "Une rubrique porte déjà ce nom." };
  }
  updateTag(TAGS.rubriques);
  updateTag(TAGS.articles);
  return { ok: true, message: id ? "Rubrique renommée." : "Rubrique créée." };
}

export async function supprimerRubrique(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const n = await prisma.article.count({ where: { rubriqueId: id } });
  if (n > 0) return { ok: false, message: `Impossible : ${n} article(s) utilisent cette rubrique.` };
  const r = await prisma.rubrique.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "Rubrique", id, { nom: r.nom });
  updateTag(TAGS.rubriques);
  return { ok: true, message: "Rubrique supprimée." };
}

/* ───────────── Mots-clés ───────────── */

export async function renommerMotCle(id: string, nom: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const n = nom.trim();
  if (n.length < 2) return { ok: false, message: "Nom trop court." };
  try {
    await prisma.motCle.update({ where: { id }, data: { nom: n, slug: slugify(n) } });
  } catch {
    return { ok: false, message: "Ce mot-clé existe déjà." };
  }
  await journaliser(admin.id, "MODIFICATION", "MotCle", id, { nom: n });
  updateTag(TAGS.motsCles);
  updateTag(TAGS.articles);
  return { ok: true, message: "Mot-clé renommé." };
}

export async function supprimerMotCle(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const m = await prisma.motCle.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "MotCle", id, { nom: m.nom });
  updateTag(TAGS.motsCles);
  updateTag(TAGS.articles);
  return { ok: true, message: "Mot-clé supprimé." };
}

/* ───────────── Commentaires ───────────── */

export async function modererCommentaire(id: string, statut: "APPROUVE" | "REJETE"): Promise<Etat> {
  const admin = await exigerAdmin();
  const c = await prisma.commentaire.update({ where: { id }, data: { statut, signalements: statut === "APPROUVE" ? 0 : undefined } });
  await journaliser(admin.id, statut === "APPROUVE" ? "APPROBATION" : "REJET", "Commentaire", id, { auteur: c.nom });
  updateTag(TAGS.commentaires(c.articleId));
  return { ok: true, message: statut === "APPROUVE" ? "Commentaire approuvé." : "Commentaire rejeté." };
}

export async function supprimerCommentaire(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const c = await prisma.commentaire.findUnique({ where: { id } });
  if (!c) return { ok: false, message: "Commentaire introuvable." };
  await prisma.$transaction([
    prisma.commentaire.updateMany({ where: { parentId: id }, data: { parentId: null } }),
    prisma.commentaire.delete({ where: { id } }),
  ]);
  await journaliser(admin.id, "SUPPRESSION", "Commentaire", id, { auteur: c.nom });
  updateTag(TAGS.commentaires(c.articleId));
  return { ok: true, message: "Commentaire supprimé." };
}

export async function repondreCommentaire(parentId: string, message: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const texte = message.trim();
  if (texte.length < 2) return { ok: false, message: "Réponse vide." };
  const parent = await prisma.commentaire.findUnique({ where: { id: parentId } });
  if (!parent) return { ok: false, message: "Commentaire introuvable." };
  await prisma.commentaire.create({
    data: { articleId: parent.articleId, parentId, nom: "La rédaction DIWA MAG", email: admin.email, message: texte, statut: "APPROUVE" },
  });
  if (parent.statut === "EN_ATTENTE") await prisma.commentaire.update({ where: { id: parentId }, data: { statut: "APPROUVE" } });
  await journaliser(admin.id, "REPONSE", "Commentaire", parentId);
  updateTag(TAGS.commentaires(parent.articleId));
  return { ok: true, message: "Réponse publiée." };
}

/* ───────────── Médias ───────────── */

export async function modifierMedia(id: string, texteAlternatif: string, legende: string): Promise<Etat> {
  const admin = await exigerAdmin();
  if (texteAlternatif.trim().length < 3) return { ok: false, message: "Le texte alternatif est obligatoire." };
  await prisma.media.update({ where: { id }, data: { texteAlternatif: texteAlternatif.trim(), legende: legende.trim() || null } });
  await journaliser(admin.id, "MODIFICATION", "Media", id);
  return { ok: true, message: "Média mis à jour." };
}

export async function supprimerMedia(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const m = await prisma.media.findUnique({ where: { id } });
  if (!m) return { ok: false, message: "Média introuvable." };
  const utilise = await prisma.article.count({ where: { imageUneUrl: m.url } });
  if (utilise) return { ok: false, message: `Média utilisé comme image de Une par ${utilise} article(s).` };
  await prisma.media.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "Media", id, { url: m.url });
  return { ok: true, message: "Média retiré de la bibliothèque." };
}

/* ───────────── Numéros mensuels ───────────── */

const schemaNumero = z.object({
  id: z.string().optional(),
  titre: z.string().trim().min(3, "Titre trop court.").max(200),
  mois: z.string().regex(/^\d{4}-\d{2}$/, "Mois au format AAAA-MM."),
  couvertureUrl: z.string().trim().min(1, "La couverture est obligatoire."),
  pdfUrl: z.string().trim().optional(),
  edito: z.string().trim().max(2000).optional(),
  titreEn: z.string().trim().max(200).optional(),
  editoEn: z.string().trim().max(2000).optional(),
  publie: z.string().optional(),
  articles: z.string().default(""),
});

export async function enregistrerNumero(_: Etat, formData: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const p = schemaNumero.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, message: premiereErreur(p.error) };
  const d = p.data;
  const ids = d.articles.split(",").filter(Boolean);
  const data = {
    titre: d.titre,
    slug: slugify(d.titre),
    mois: new Date(`${d.mois}-01T00:00:00Z`),
    couvertureUrl: d.couvertureUrl,
    pdfUrl: d.pdfUrl || null,
    edito: d.edito || null,
    titreEn: d.titreEn || null,
    editoEn: d.editoEn || null,
    publie: d.publie === "on",
  };
  try {
    await prisma.$transaction(async (tx) => {
      const n = d.id ? await tx.numero.update({ where: { id: d.id }, data }) : await tx.numero.create({ data });
      await tx.numeroArticle.deleteMany({ where: { numeroId: n.id } });
      await tx.numeroArticle.createMany({ data: ids.map((articleId, ordre) => ({ numeroId: n.id, articleId, ordre })) });
      await journaliser(admin.id, d.id ? "MODIFICATION" : "CREATION", "Numero", n.id, { titre: n.titre });
    }, OPTIONS_TRANSACTION);
  } catch {
    return { ok: false, message: "Un numéro porte déjà ce titre." };
  }
  updateTag(TAGS.numeros);
  return { ok: true, message: "Numéro enregistré." };
}

export async function supprimerNumero(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const n = await prisma.numero.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "Numero", id, { titre: n.titre });
  updateTag(TAGS.numeros);
  return { ok: true, message: "Numéro supprimé." };
}

/* ───────────── Newsletter ───────────── */

export async function envoyerNewsletter(_: Etat, formData: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const numeroId = String(formData.get("numeroId") || "");
  const sujet = String(formData.get("sujet") || "").trim();
  const intro = String(formData.get("intro") || "").trim();
  if (sujet.length < 3) return { ok: false, message: "Indiquez un objet." };
  if (!process.env.RESEND_API_KEY) return { ok: false, message: "Service d'e-mail non configuré (RESEND_API_KEY)." };

  const numero = numeroId
    ? await prisma.numero.findUnique({
        where: { id: numeroId },
        include: { articles: { orderBy: { ordre: "asc" }, include: { article: true }, where: { article: { statut: "PUBLIE" } } } },
      })
    : null;
  const articles = numero
    ? numero.articles.map((x) => x.article)
    : await prisma.article.findMany({ where: { statut: "PUBLIE" }, orderBy: { datePublication: "desc" }, take: 6 });

  const abonnes = await prisma.abonneNewsletter.findMany({ where: { confirme: true, desinscritLe: null } });
  if (abonnes.length === 0) return { ok: false, message: "Aucun abonné confirmé." };

  const blocs = articles
    .slice(0, 10)
    .map(
      (a) =>
        `<tr><td style="padding:14px 0;border-bottom:1px solid #eee"><a href="${siteUrl(`/fr/article/${a.slug}`)}" style="color:#111;font-size:18px;font-weight:bold;text-decoration:none">${echapper(a.titre)}</a><p style="margin:6px 0 0;color:#555;font-size:14px;line-height:1.5">${echapper(a.chapeau)}</p></td></tr>`,
    )
    .join("");
  // Bannière sponsor (emplacement NEWSLETTER) : une campagne en cours, tirée selon son poids.
  const maintenant = new Date();
  const sponsors = await prisma.publicite.findMany({
    where: { emplacement: "NEWSLETTER", actif: true, AND: [{ OR: [{ debut: null }, { debut: { lte: maintenant } }] }, { OR: [{ fin: null }, { fin: { gt: maintenant } }] }] },
  });
  let sponsor = sponsors[0] ?? null;
  if (sponsors.length > 1) {
    let tirage = Math.random() * sponsors.reduce((t, p) => t + Math.max(1, p.poids), 0);
    sponsor = sponsors.find((p) => (tirage -= Math.max(1, p.poids)) < 0) ?? sponsors[0];
  }
  const blocSponsor = sponsor
    ? `<div style="padding:14px 20px 0"><p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px">Publicité · Cette édition vous est offerte par ${echapper(sponsor.annonceur)}</p><a href="${siteUrl(`/api/pub/${sponsor.id}/clic`)}"><img src="${sponsor.imageUrl.startsWith("/") ? siteUrl(sponsor.imageUrl) : sponsor.imageUrl}" alt="${echapper(sponsor.imageAlt)}" style="width:100%;max-width:560px;display:block;border:0"></a></div>`
    : "";
  let envoyes = 0;
  for (const ab of abonnes) {
    const lienDesinscription = siteUrl(`/newsletter/desinscrire?jeton=${ab.jetonConfirmation}`);
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><div style="background:#111;padding:20px;color:#fff;font:bold 28px Impact,Arial">DIW<span style="color:#cda40e">A</span> MAG</div>${numero ? `<img src="${numero.couvertureUrl.startsWith("/") ? siteUrl(numero.couvertureUrl) : numero.couvertureUrl}" alt="" style="width:100%;max-width:600px">` : ""}${blocSponsor}<div style="padding:20px">${intro ? `<p style="font-size:15px;line-height:1.6">${echapper(intro).replace(/\n/g, "<br>")}</p>` : ""}<table width="100%" cellpadding="0" cellspacing="0">${blocs}</table><p style="font-size:11px;color:#888;margin-top:24px">Vous recevez cet e-mail car vous êtes inscrit·e à la newsletter DIWA MAG. <a href="${lienDesinscription}" style="color:#888">Se désinscrire</a></p></div></div>`;
    const r = await envoyerEmail({ a: ab.email, sujet, html });
    if (r.ok) envoyes++;
  }
  if (sponsor && envoyes) await prisma.publicite.update({ where: { id: sponsor.id }, data: { affichages: { increment: envoyes } } });
  await journaliser(admin.id, "ENVOI_NEWSLETTER", "Newsletter", numero?.id ?? null, { sujet, envoyes, total: abonnes.length, sponsor: sponsor?.annonceur ?? null });
  return { ok: true, message: `Newsletter envoyée à ${envoyes} abonné(s) sur ${abonnes.length}.` };
}

export async function supprimerAbonne(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  await prisma.abonneNewsletter.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "AbonneNewsletter", id);
  return { ok: true, message: "Abonné supprimé." };
}

/* ───────────── Utilisateurs (super-administrateur) ───────────── */

const schemaUtilisateur = z.object({
  id: z.string().optional(),
  nom: z.string().trim().min(2, "Nom trop court.").max(80),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]),
  bio: z.string().trim().max(500).optional(),
  motDePasse: z.string().optional(),
});

export async function enregistrerUtilisateur(_: Etat, formData: FormData): Promise<Etat> {
  const admin = await exigerSuperAdmin();
  const p = schemaUtilisateur.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, message: premiereErreur(p.error) };
  const d = p.data;
  if (d.motDePasse && d.motDePasse.length < 10) return { ok: false, message: "Le mot de passe doit comporter au moins 10 caractères." };
  if (d.id === admin.id && d.role !== "SUPER_ADMIN") return { ok: false, message: "Vous ne pouvez pas retirer votre propre rôle de super-administrateur." };

  let motDePasseGenere: string | null = null;
  const motDePasse = d.motDePasse || (!d.id ? (motDePasseGenere = randomBytes(9).toString("base64url")) : null);
  try {
    const u = d.id
      ? await prisma.admin.update({
          where: { id: d.id },
          data: { nom: d.nom, email: d.email, role: d.role, bio: d.bio || null, ...(motDePasse ? { motDePasse: await bcrypt.hash(motDePasse, 12) } : {}) },
        })
      : await prisma.admin.create({
          data: { nom: d.nom, email: d.email, role: d.role, bio: d.bio || null, motDePasse: await bcrypt.hash(motDePasse!, 12) },
        });
    await journaliser(admin.id, d.id ? "MODIFICATION" : "CREATION", "Admin", u.id, { email: u.email, role: u.role });
  } catch {
    return { ok: false, message: "Cette adresse e-mail est déjà utilisée." };
  }
  updateTag(TAGS.articles);
  return {
    ok: true,
    message: motDePasseGenere
      ? `Compte créé. Mot de passe provisoire à transmettre de façon sécurisée : ${motDePasseGenere}`
      : "Compte enregistré.",
  };
}

export async function basculerActivation(id: string): Promise<Etat> {
  const admin = await exigerSuperAdmin();
  if (id === admin.id) return { ok: false, message: "Vous ne pouvez pas désactiver votre propre compte." };
  const u = await prisma.admin.findUnique({ where: { id } });
  if (!u) return { ok: false, message: "Compte introuvable." };
  await prisma.admin.update({ where: { id }, data: { actif: !u.actif } });
  await journaliser(admin.id, u.actif ? "DESACTIVATION" : "ACTIVATION", "Admin", id, { email: u.email });
  return { ok: true, message: u.actif ? "Compte désactivé." : "Compte réactivé." };
}

export async function supprimerUtilisateur(id: string): Promise<Etat> {
  const admin = await exigerSuperAdmin();
  if (id === admin.id) return { ok: false, message: "Vous ne pouvez pas supprimer votre propre compte." };
  const articles = await prisma.article.count({ where: { auteurId: id } });
  if (articles > 0) return { ok: false, message: `Ce compte signe ${articles} article(s) : désactivez-le plutôt que de le supprimer.` };
  try {
    const u = await prisma.admin.delete({ where: { id } });
    await journaliser(admin.id, "SUPPRESSION", "Admin", id, { email: u.email });
  } catch {
    return { ok: false, message: "Ce compte a un historique (journal, versions, médias) : désactivez-le plutôt." };
  }
  return { ok: true, message: "Compte supprimé." };
}

export async function changerMotDePasse(_: Etat, formData: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const actuel = String(formData.get("actuel") || "");
  const nouveau = String(formData.get("nouveau") || "");
  if (nouveau.length < 10) return { ok: false, message: "Le nouveau mot de passe doit comporter au moins 10 caractères." };
  const u = await prisma.admin.findUnique({ where: { id: admin.id } });
  if (!u || !(await bcrypt.compare(actuel, u.motDePasse))) return { ok: false, message: "Mot de passe actuel incorrect." };
  await prisma.admin.update({ where: { id: admin.id }, data: { motDePasse: await bcrypt.hash(nouveau, 12) } });
  await journaliser(admin.id, "CHANGEMENT_MOT_DE_PASSE", "Admin", admin.id);
  return { ok: true, message: "Mot de passe modifié." };
}
