// Lecture publique de la Veille Média (mise en cache, invalidée à chaque collecte).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma, ZoneVeille } from "@/lib/generated/prisma/client";
import { zonesDuFiltre } from "./classement";
import { ZONES, type ZoneVeilleCle } from "./defauts";

const TAG = "veille";
export const PAR_PAGE = 18;

export function estZone(v: string | undefined): v is ZoneVeilleCle {
  return !!v && v in ZONES;
}

export async function getCategoriesVeille() {
  "use cache";
  cacheTag(TAG);
  cacheLife("hours");
  return prisma.categorieVeille.findMany({ where: { actif: true }, orderBy: { ordre: "asc" }, select: { slug: true, nom: true, nomEn: true } });
}

export type FiltresVeille = { categorie?: string; zone?: ZoneVeilleCle; q?: string; ordre?: "recent" | "ancien"; page?: number };

export async function getActualitesVeille(f: FiltresVeille) {
  "use cache";
  cacheTag(TAG);
  cacheLife("minutes");
  const q = f.q?.trim().slice(0, 100);
  const where: Prisma.ActualiteVeilleWhereInput = {
    masquee: false,
    ...(f.categorie ? { categories: { has: f.categorie } } : {}),
    ...(f.zone ? { zone: { in: zonesDuFiltre(f.zone) as ZoneVeille[] } } : {}),
    ...(q ? { OR: [{ titre: { contains: q, mode: "insensitive" } }, { extrait: { contains: q, mode: "insensitive" } }, { source: { nom: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const page = Math.max(1, f.page ?? 1);
  const [actualites, total] = await Promise.all([
    prisma.actualiteVeille.findMany({
      where,
      orderBy: { datePublication: f.ordre === "ancien" ? "asc" : "desc" },
      take: PAR_PAGE,
      skip: (page - 1) * PAR_PAGE,
      select: { id: true, titre: true, extrait: true, url: true, imageUrl: true, langue: true, datePublication: true, categories: true, zone: true, source: { select: { nom: true } } },
    }),
    prisma.actualiteVeille.count({ where }),
  ]);
  return { actualites, total, pages: Math.max(1, Math.ceil(total / PAR_PAGE)) };
}

export type ActualiteVeilleCarte = Awaited<ReturnType<typeof getActualitesVeille>>["actualites"][number];

export async function getActualiteVeille(id: string) {
  "use cache";
  cacheTag(TAG);
  cacheLife("hours");
  const a = await prisma.actualiteVeille.findFirst({
    where: { id, masquee: false },
    select: { id: true, titre: true, extrait: true, url: true, imageUrl: true, langue: true, datePublication: true, categories: true, zone: true, source: { select: { nom: true, siteUrl: true } } },
  });
  if (!a) return null;
  const proches = await prisma.actualiteVeille.findMany({
    where: { masquee: false, id: { not: a.id }, ...(a.categories[0] ? { categories: { has: a.categories[0] } } : {}) },
    orderBy: { datePublication: "desc" },
    take: 4,
    select: { id: true, titre: true, datePublication: true, source: { select: { nom: true } } },
  });
  return { ...a, proches };
}

export async function getDerniersIdsVeille() {
  "use cache";
  cacheTag(TAG);
  cacheLife("hours");
  const l = await prisma.actualiteVeille.findMany({ where: { masquee: false }, orderBy: { datePublication: "desc" }, take: 20, select: { id: true } });
  return l.map((x) => x.id);
}
