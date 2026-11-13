"use server";
// Administration de la Veille Média : sources RSS, catégories, actualités, collecte manuelle.

import { updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerAdmin, journaliser } from "@/lib/admin";
import { slugify } from "@/lib/content";
import type { Etat } from "@/lib/actions/gestion";
import type { ZoneVeille } from "@/lib/generated/prisma/client";
import { CATEGORIES_DEFAUT, SOURCES_DEFAUT, ZONES } from "@/lib/veille/defauts";
import { collecterVeille, TAG_VEILLE } from "@/lib/veille/collecte";
import { lireFlux, ErreurFlux } from "@/lib/veille/rss";

const ZONES_VALIDES = Object.keys(ZONES) as [string, ...string[]];

/** Installe (sans rien écraser) les catégories et les sources recommandées. */
export async function installerVeilleRecommandee(): Promise<Etat> {
  const admin = await exigerAdmin();
  const cats = await prisma.categorieVeille.createMany({
    data: CATEGORIES_DEFAUT.map((c, i) => ({ ...c, ordre: i })),
    skipDuplicates: true,
  });
  const sources = await prisma.sourceVeille.createMany({
    data: SOURCES_DEFAUT.map((s) => ({ ...s, zoneParDefaut: s.zoneParDefaut as ZoneVeille | null })),
    skipDuplicates: true,
  });
  await journaliser(admin.id, "INSTALLATION", "Veille", null, { categories: cats.count, sources: sources.count });
  updateTag(TAG_VEILLE);
  return { ok: true, message: `${cats.count} catégorie(s) et ${sources.count} source(s) ajoutées.` };
}

const schemaSource = z.object({
  id: z.string().optional().transform((v) => v || undefined),
  nom: z.string().trim().min(2, "Nom trop court.").max(80),
  url: z.string().trim().url("Adresse du flux invalide.").max(1000).refine((v) => /^https?:\/\//i.test(v), "Le flux doit commencer par https://"),
  siteUrl: z.string().trim().max(1000).optional().transform((v) => v || null),
  langue: z.enum(["fr", "en"]),
  zoneParDefaut: z.string().optional().transform((v) => (v && ZONES_VALIDES.includes(v) ? (v as ZoneVeille) : null)),
  categorieParDefaut: z.string().optional().transform((v) => v || null),
  filtrerTech: z.string().optional().transform((v) => v === "on"),
  actif: z.string().optional().transform((v) => v === "on"),
});

export async function enregistrerSourceVeille(_: Etat, formData: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const p = schemaSource.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Formulaire invalide." };
  const { id, ...data } = p.data;
  // Vérification du flux avant enregistrement : une adresse qui ne renvoie pas de flux est refusée.
  let nb = 0;
  try {
    nb = (await lireFlux(data.url)).length;
  } catch (e) {
    return { ok: false, message: `Flux non valide : ${e instanceof ErreurFlux ? e.message : "lecture impossible."}` };
  }
  try {
    const s = id ? await prisma.sourceVeille.update({ where: { id }, data }) : await prisma.sourceVeille.create({ data });
    await journaliser(admin.id, id ? "MODIFICATION" : "CREATION", "SourceVeille", s.id, { nom: s.nom, url: s.url });
  } catch {
    return { ok: false, message: "Cette adresse de flux est déjà enregistrée." };
  }
  return { ok: true, message: `${id ? "Source mise à jour" : "Source ajoutée"} : ${nb} actualité(s) lisible(s) dans le flux.` };
}

export async function basculerSourceVeille(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const s = await prisma.sourceVeille.findUnique({ where: { id }, select: { actif: true, nom: true } });
  if (!s) return { ok: false, message: "Source introuvable." };
  await prisma.sourceVeille.update({ where: { id }, data: { actif: !s.actif } });
  await journaliser(admin.id, s.actif ? "DESACTIVATION" : "ACTIVATION", "SourceVeille", id, { nom: s.nom });
  return { ok: true, message: s.actif ? "Source désactivée." : "Source activée." };
}

export async function supprimerSourceVeille(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const s = await prisma.sourceVeille.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "SourceVeille", id, { nom: s.nom });
  updateTag(TAG_VEILLE);
  return { ok: true, message: "Source et ses actualités supprimées." };
}

/** Collecte immédiate (toutes les sources actives, ou une seule). */
export async function collecterVeilleMaintenant(sourceId?: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const b = await collecterVeille(sourceId ? [sourceId] : undefined);
  const erreurs = b.sources.filter((s) => s.erreur).length;
  await journaliser(admin.id, "COLLECTE", "Veille", sourceId ?? null, { ajoutees: b.ajoutees, erreurs, notifications: b.notifications.envoyees });
  updateTag(TAG_VEILLE);
  return {
    ok: erreurs < b.sources.length || b.sources.length === 0,
    message: `${b.ajoutees} actualité(s) ajoutée(s), ${b.sources.length - erreurs}/${b.sources.length} source(s) lues, ${b.notifications.envoyees} notification(s) en ${Math.round(b.duree / 1000)} s.`,
  };
}

const schemaCategorie = z.object({
  id: z.string().optional().transform((v) => v || undefined),
  nom: z.string().trim().min(2).max(60),
  nomEn: z.string().trim().min(2).max(60),
  motsCles: z.string().max(4000).transform((v) => [...new Set(v.split(/[,\n]/).map((m) => m.trim()).filter(Boolean))].slice(0, 150)),
  ordre: z.coerce.number().int().min(0).max(99).default(0),
});

export async function enregistrerCategorieVeille(_: Etat, formData: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const p = schemaCategorie.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, message: "Nom (FR et EN) requis, 2 caractères minimum." };
  const { id, ...d } = p.data;
  try {
    const c = id
      ? await prisma.categorieVeille.update({ where: { id }, data: d })
      : await prisma.categorieVeille.create({ data: { ...d, slug: slugify(d.nom) } });
    await journaliser(admin.id, id ? "MODIFICATION" : "CREATION", "CategorieVeille", c.id, { nom: c.nom });
  } catch {
    return { ok: false, message: "Une catégorie porte déjà ce nom." };
  }
  updateTag(TAG_VEILLE);
  return { ok: true, message: id ? "Catégorie mise à jour (appliquée aux prochaines collectes)." : "Catégorie créée." };
}

export async function basculerCategorieVeille(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const c = await prisma.categorieVeille.findUnique({ where: { id }, select: { actif: true, nom: true } });
  if (!c) return { ok: false, message: "Catégorie introuvable." };
  await prisma.categorieVeille.update({ where: { id }, data: { actif: !c.actif } });
  await journaliser(admin.id, c.actif ? "DESACTIVATION" : "ACTIVATION", "CategorieVeille", id, { nom: c.nom });
  updateTag(TAG_VEILLE);
  return { ok: true, message: c.actif ? "Catégorie masquée." : "Catégorie réactivée." };
}

export async function masquerActualiteVeille(id: string, masquee: boolean): Promise<Etat> {
  const admin = await exigerAdmin();
  const a = await prisma.actualiteVeille.update({ where: { id }, data: { masquee } });
  await journaliser(admin.id, masquee ? "MASQUAGE" : "AFFICHAGE", "ActualiteVeille", id, { titre: a.titre });
  updateTag(TAG_VEILLE);
  return { ok: true, message: masquee ? "Actualité masquée." : "Actualité de nouveau visible." };
}

export async function supprimerActualiteVeille(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const a = await prisma.actualiteVeille.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "ActualiteVeille", id, { titre: a.titre, url: a.url });
  updateTag(TAG_VEILLE);
  return { ok: true, message: "Actualité supprimée." };
}
