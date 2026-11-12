"use server";
// Création de l'article BROUILLON à partir d'un import validé par un administrateur.
// Jamais de publication ici : l'article suit ensuite le circuit normal (éditeur, aperçu, publication).

import { redirect } from "next/navigation";
import { z } from "zod";
import { OPTIONS_TRANSACTION, prisma } from "@/lib/db";
import { lierMotsCles } from "@/lib/mots-cles";
import { exigerAdmin, journaliser } from "@/lib/admin";
import { slugify, tempsDeLecture } from "@/lib/content";
import type { Prisma } from "@/lib/generated/prisma/client";
import { BlocSchema, ResultatImportSchema } from "@/lib/import-pdf/schema";
import { blocsVersTiptap, texteLegende, type ImageResolue } from "@/lib/import-pdf/conversion";
import { supprimerImage } from "@/lib/import-pdf/stockage";

export type EtatValidation = { ok: boolean; message: string; erreurs?: Record<string, string> } | null;

const RevueSchema = z.object({
  titre: z.string().trim().min(5, "Le titre doit comporter au moins 5 caractères.").max(200),
  chapeau: z.string().trim().max(600, "Le chapeau est trop long (600 caractères maximum)."),
  rubriqueId: z.string().min(1, "Choisissez une rubrique."),
  type: z.enum(["ACTUALITE", "INTERVIEW", "DOSSIER"]),
  slug: z.string().trim().max(120),
  metaTitre: z.string().trim().max(70, "Titre SEO : 70 caractères maximum."),
  metaDescription: z.string().trim().max(160, "Description SEO : 160 caractères maximum."),
  motsCles: z.array(z.string().trim().min(1).max(60)).max(15),
  blocs: z.array(BlocSchema).max(600),
  images: z
    .array(
      z.object({
        id: z.string(),
        conserver: z.boolean(),
        alt: z.string().trim().max(300),
        legende: z.string().trim().max(300).nullable(),
        credit: z.string().trim().max(200).nullable(),
      }),
    )
    .max(80),
  imageUne: z.string().nullable(),
});
export type Revue = z.infer<typeof RevueSchema>;

async function slugUnique(base: string) {
  let slug = base || "article";
  for (let i = 2; ; i++) {
    if (!(await prisma.article.findUnique({ where: { slug }, select: { id: true } }))) return slug;
    slug = `${base}-${i}`;
  }
}

export async function creerBrouillonDepuisImport(importId: string, donnees: Revue): Promise<EtatValidation> {
  const admin = await exigerAdmin();
  const parsed = RevueSchema.safeParse(donnees);
  if (!parsed.success) {
    const erreurs: Record<string, string> = {};
    for (const i of parsed.error.issues) erreurs[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Merci de corriger les champs indiqués.", erreurs };
  }
  const d = parsed.data;
  const imp = await prisma.importPdf.findUnique({ where: { id: importId } });
  if (!imp || imp.statut !== "A_VERIFIER") return { ok: false, message: "Cet import n'est plus en attente de validation." };
  const resultat = ResultatImportSchema.safeParse(imp.resultat);
  if (!resultat.success) return { ok: false, message: "Le résultat de l'analyse est invalide : relancez l'import." };
  if (!(await prisma.rubrique.findUnique({ where: { id: d.rubriqueId }, select: { id: true } }))) {
    return { ok: false, message: "Rubrique introuvable.", erreurs: { rubriqueId: "Rubrique introuvable." } };
  }

  // Images retenues : seules celles réellement extraites de CET import sont acceptées.
  const stockees = new Map(resultat.data.images.map((i) => [i.id, i]));
  const choix = new Map(d.images.map((i) => [i.id, i]));
  const retenues = new Map<string, ImageResolue & { publicId: string; largeur: number; hauteur: number }>();
  for (const [id, img] of stockees) {
    const c = choix.get(id);
    if (!c?.conserver) continue;
    if (c.alt.length < 3) return { ok: false, message: "Chaque image conservée doit avoir un texte alternatif.", erreurs: { images: `Texte alternatif manquant (${id}).` } };
    retenues.set(id, { url: img.url, publicId: img.publicId, largeur: img.largeur, hauteur: img.hauteur, alt: c.alt, legende: c.legende || null, credit: c.credit || null });
  }
  const une = d.imageUne ? retenues.get(d.imageUne) : undefined;
  if (d.imageUne && !une) return { ok: false, message: "L'image à la une doit faire partie des images conservées.", erreurs: { imageUne: "Image non conservée." } };

  // L'image à la une n'est pas répétée dans le corps de l'article.
  const doc = blocsVersTiptap(
    d.blocs.filter((b) => !(b.type === "image" && b.imageId === d.imageUne)),
    retenues,
  );
  const slug = await slugUnique(slugify(d.slug || d.titre));
  const noms = [...new Set(d.motsCles)].slice(0, 15);

  const article = await prisma.$transaction(async (tx) => {
    // Verrou : un import ne produit qu'un seul article, même en cas de double clic.
    const verrou = await tx.importPdf.updateMany({ where: { id: importId, statut: "A_VERIFIER" }, data: { statut: "TERMINE" } });
    if (!verrou.count) throw new Error("IMPORT_DEJA_VALIDE");
    const a = await tx.article.create({
      data: {
        titre: d.titre,
        slug,
        chapeau: d.chapeau,
        contenu: doc as unknown as Prisma.InputJsonValue,
        type: d.type,
        statut: "BROUILLON",
        imageUneUrl: une?.url ?? null,
        imageUneAlt: une?.alt ?? null,
        metaTitre: d.metaTitre || null,
        metaDescription: d.metaDescription || null,
        tempsLecture: tempsDeLecture(doc),
        rubrique: { connect: { id: d.rubriqueId } },
        auteur: { connect: { id: admin.id } },
      },
    });
    await lierMotsCles(tx, a.id, noms);
    await tx.articleVersion.create({ data: { articleId: a.id, titre: a.titre, contenu: a.contenu as Prisma.InputJsonValue, modifieParId: admin.id } });
    // Les images retenues rejoignent la médiathèque partagée (une seule requête).
    await tx.media.createMany({
      data: [...retenues.values()].map((img) => ({
        url: img.url,
        publicId: img.publicId,
        type: "IMAGE" as const,
        legende: texteLegende(img.legende, img.credit) || null,
        texteAlternatif: img.alt,
        largeur: img.largeur,
        hauteur: img.hauteur,
        ajouteParId: admin.id,
      })),
    });
    await tx.importPdf.update({ where: { id: importId }, data: { articleId: a.id } });
    return a;
  }, OPTIONS_TRANSACTION).catch((e) => {
    if (e instanceof Error && e.message === "IMPORT_DEJA_VALIDE") return null;
    throw e;
  });
  if (!article) return { ok: false, message: "Cet import a déjà été validé." };

  // Images écartées par le rédacteur : supprimées du stockage.
  for (const [id, img] of stockees) if (!retenues.has(id)) await supprimerImage(img.publicId);
  await journaliser(admin.id, "CREATION", "Article", article.id, { titre: article.titre, statut: "BROUILLON", source: `Import PDF ${imp.nomFichier}` });
  redirect(`/admin/articles/${article.id}?import=1`);
}
