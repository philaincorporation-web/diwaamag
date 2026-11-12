// Rattachement des mots-clés à un article en quelques requêtes groupées (et non une par mot-clé),
// à utiliser dans une transaction.
import "server-only";
import { slugify } from "@/lib/content";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function lierMotsCles(tx: Prisma.TransactionClient, articleId: string, noms: string[]) {
  const parSlug = new Map<string, string>();
  for (const nom of noms) {
    const slug = slugify(nom);
    if (slug && !parSlug.has(slug)) parSlug.set(slug, nom.trim());
  }
  await tx.articleMotCle.deleteMany({ where: { articleId } });
  if (!parSlug.size) return;
  await tx.motCle.createMany({ data: [...parSlug].map(([slug, nom]) => ({ slug, nom })), skipDuplicates: true });
  const motsCles = await tx.motCle.findMany({ where: { slug: { in: [...parSlug.keys()] } }, select: { id: true } });
  await tx.articleMotCle.createMany({ data: motsCles.map((m) => ({ articleId, motCleId: m.id })), skipDuplicates: true });
}
