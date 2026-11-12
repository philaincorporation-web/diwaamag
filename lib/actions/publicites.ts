"use server";
// Gestion des campagnes publicitaires et des demandes d'annonceurs (back-office).

import { updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/data";
import { exigerAdmin, journaliser } from "@/lib/admin";
import type { Etat } from "@/lib/actions/gestion";

const EMPLACEMENTS = ["HAUT_PAGE", "ACCUEIL", "ARTICLE_HAUT", "ARTICLE_BAS", "BARRE_LATERALE", "SPONSORS", "NEWSLETTER"] as const;

/** Date du formulaire (AAAA-MM-JJ) : début à 00 h 00, fin à 23 h 59 (heure de Libreville, UTC+1). */
const date = (fin: boolean) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const d = new Date(`${v}T${fin ? "23:59:59" : "00:00:00"}+01:00`);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: "Date invalide." });
        return z.NEVER;
      }
      return d;
    });

const schema = z
  .object({
    id: z.string().optional().transform((v) => v || undefined),
    nom: z.string().trim().min(2, "Nom de campagne trop court.").max(120),
    annonceur: z.string().trim().min(2, "Indiquez l'annonceur.").max(120),
    emplacement: z.enum(EMPLACEMENTS, { message: "Choisissez un emplacement." }),
    imageUrl: z.string().trim().min(1, "Choisissez une image.").max(1000).refine((v) => /^(https:\/\/|\/)/.test(v), "Adresse d'image invalide."),
    imageAlt: z.string().trim().min(3, "Décrivez l'image (texte alternatif).").max(200),
    lien: z.string().trim().max(1000).refine((v) => /^https?:\/\//i.test(v), "Le lien doit commencer par https://"),
    debut: date(false),
    fin: date(true),
    poids: z.coerce.number().int().min(1).max(10).default(1),
    actif: z.string().optional().transform((v) => v === "on"),
  })
  .refine((d) => !d.debut || !d.fin || d.fin > d.debut, { message: "La date de fin doit suivre la date de début.", path: ["fin"] });

export async function enregistrerPublicite(_: Etat, formData: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const p = schema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Formulaire invalide." };
  const { id, ...data } = p.data;
  const pub = id ? await prisma.publicite.update({ where: { id }, data }) : await prisma.publicite.create({ data });
  await journaliser(admin.id, id ? "MODIFICATION" : "CREATION", "Publicite", pub.id, { nom: pub.nom, annonceur: pub.annonceur, emplacement: pub.emplacement });
  updateTag(TAGS.publicites);
  return { ok: true, message: id ? "Campagne mise à jour." : "Campagne créée." };
}

export async function basculerPublicite(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const pub = await prisma.publicite.findUnique({ where: { id }, select: { actif: true, nom: true } });
  if (!pub) return { ok: false, message: "Campagne introuvable." };
  await prisma.publicite.update({ where: { id }, data: { actif: !pub.actif } });
  await journaliser(admin.id, pub.actif ? "SUSPENSION" : "ACTIVATION", "Publicite", id, { nom: pub.nom });
  updateTag(TAGS.publicites);
  return { ok: true, message: pub.actif ? "Campagne suspendue." : "Campagne activée." };
}

export async function reinitialiserStatsPublicite(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  await prisma.publicite.update({ where: { id }, data: { affichages: 0, clics: 0 } });
  await journaliser(admin.id, "REINITIALISATION", "Publicite", id);
  return { ok: true, message: "Compteurs remis à zéro." };
}

export async function supprimerPublicite(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const pub = await prisma.publicite.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "Publicite", id, { nom: pub.nom, annonceur: pub.annonceur, affichages: pub.affichages, clics: pub.clics });
  updateTag(TAGS.publicites);
  return { ok: true, message: "Campagne supprimée." };
}

export async function marquerDemandeAnnonceur(id: string, traitee: boolean): Promise<Etat> {
  const admin = await exigerAdmin();
  await prisma.demandeAnnonceur.update({ where: { id }, data: { traitee } });
  await journaliser(admin.id, traitee ? "TRAITEMENT" : "REOUVERTURE", "DemandeAnnonceur", id);
  return { ok: true, message: traitee ? "Demande marquée comme traitée." : "Demande rouverte." };
}

export async function supprimerDemandeAnnonceur(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  await prisma.demandeAnnonceur.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "DemandeAnnonceur", id);
  return { ok: true, message: "Demande supprimée." };
}
