// Lectures communes aux pages du back-office (non mises en cache : données toujours fraîches).
import "server-only";
import { prisma } from "@/lib/db";
import type { MediaLeger } from "@/components/admin/mediatheque";

export async function donneesEditeur() {
  const [rubriques, medias, motsCles] = await Promise.all([
    prisma.rubrique.findMany({ orderBy: [{ famille: "asc" }, { ordre: "asc" }], select: { id: true, nom: true, famille: true } }),
    prisma.media.findMany({
      orderBy: { creeLe: "desc" },
      take: 120,
      select: { id: true, url: true, type: true, texteAlternatif: true, legende: true },
    }),
    prisma.motCle.findMany({ orderBy: { nom: "asc" }, select: { nom: true } }),
  ]);
  return { rubriques, medias: medias as MediaLeger[], motsClesExistants: motsCles.map((m) => m.nom) };
}
