"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/data";
import { exigerAdmin, journaliser } from "@/lib/admin";
import type { TiptapDoc } from "@/lib/content";
import { traduireArticle, traductionAutoDisponible } from "@/lib/traduction";
import type { Prisma } from "@/lib/generated/prisma/client";

export type EtatTraduction = { ok: boolean; message: string; erreurs?: Record<string, string> } | null;

const schema = z.object({
  articleId: z.string().min(1),
  titre: z.string().trim().min(5, "Le titre anglais doit comporter au moins 5 caractères.").max(200),
  chapeau: z.string().trim().min(20, "Le chapeau anglais doit comporter au moins 20 caractères.").max(600),
  contenu: z.string().min(2),
  relue: z.string().optional(),
});

export async function enregistrerTraduction(_: EtatTraduction, formData: FormData): Promise<EtatTraduction> {
  const admin = await exigerAdmin();
  const p = schema.safeParse(Object.fromEntries(formData));
  if (!p.success) {
    const erreurs: Record<string, string> = {};
    for (const i of p.error.issues) erreurs[String(i.path[0])] = i.message;
    return { ok: false, message: "Merci de corriger les champs indiqués.", erreurs };
  }
  const d = p.data;
  let contenu: Prisma.InputJsonValue;
  try {
    contenu = JSON.parse(d.contenu);
  } catch {
    return { ok: false, message: "Le contenu de l'éditeur est illisible." };
  }
  const article = await prisma.article.findUnique({ where: { id: d.articleId }, select: { id: true, slug: true, statut: true } });
  if (!article) return { ok: false, message: "Article introuvable." };
  const donnees = { titre: d.titre, chapeau: d.chapeau, contenu, automatique: d.relue !== "on" };
  await prisma.articleTraduction.upsert({
    where: { articleId_langue: { articleId: article.id, langue: "en" } },
    update: donnees,
    create: { ...donnees, articleId: article.id, langue: "en" },
  });
  await journaliser(admin.id, "TRADUCTION", "Article", article.id, { langue: "en", relue: d.relue === "on" });
  if (article.statut === "PUBLIE") {
    updateTag(TAGS.articles);
    updateTag(TAGS.article(article.slug));
  }
  return { ok: true, message: "Version anglaise enregistrée." };
}

export async function supprimerTraduction(articleId: string) {
  const admin = await exigerAdmin();
  const a = await prisma.article.findUnique({ where: { id: articleId }, select: { slug: true } });
  await prisma.articleTraduction.deleteMany({ where: { articleId, langue: "en" } });
  await journaliser(admin.id, "SUPPRESSION_TRADUCTION", "Article", articleId, { langue: "en" });
  updateTag(TAGS.articles);
  if (a) updateTag(TAGS.article(a.slug));
  return { ok: true, message: "Version anglaise supprimée : la version française sera affichée." };
}

/** Propose une traduction automatique (DeepL) à partir de la version française enregistrée. */
export async function proposerTraductionAuto(articleId: string) {
  await exigerAdmin();
  if (!traductionAutoDisponible()) return { ok: false as const, message: "Traduction automatique non configurée (DEEPL_API_KEY)." };
  const a = await prisma.article.findUnique({ where: { id: articleId }, select: { titre: true, chapeau: true, contenu: true } });
  if (!a) return { ok: false as const, message: "Article introuvable." };
  try {
    const t = await traduireArticle({ titre: a.titre, chapeau: a.chapeau, contenu: a.contenu as unknown as TiptapDoc });
    return { ok: true as const, message: "Traduction automatique proposée : relisez-la avant d'enregistrer.", ...t };
  } catch (e) {
    console.error(e);
    return { ok: false as const, message: "Le service de traduction n'a pas répondu." };
  }
}
