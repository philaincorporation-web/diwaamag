// Collecte de la Veille Média : relève les flux RSS actifs, normalise, déduplique, classe et
// enregistre les actualités, puis déclenche les notifications ciblées.
// Chaque source est traitée isolément : une source en panne n'empêche pas les autres.
import "server-only";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import type { ZoneVeille } from "@/lib/generated/prisma/client";
import { lireFlux, ErreurFlux } from "./rss";
import { classerCategories, classerZone } from "./classement";
import { notifierVeille } from "./notifications";

export const TAG_VEILLE = "veille";
const PARALLELE = 4;
const AGE_MAX_JOURS = 30; // les entrées plus anciennes d'un flux sont ignorées
const CONSERVATION_JOURS = 180; // les actualités plus anciennes sont supprimées

export type BilanSource = { source: string; ajoutees: number; ignorees: number; erreur?: string };

async function categoriesActives() {
  return prisma.categorieVeille.findMany({ where: { actif: true }, select: { slug: true, motsCles: true }, orderBy: { ordre: "asc" } });
}

export async function collecterSource(sourceId: string, categories?: { slug: string; motsCles: string[] }[]): Promise<BilanSource> {
  const source = await prisma.sourceVeille.findUniqueOrThrow({ where: { id: sourceId } });
  const cats = categories ?? (await categoriesActives());
  const premiereCollecte = !source.dernierReleve;
  try {
    const entrees = await lireFlux(source.url);
    const limite = Date.now() - AGE_MAX_JOURS * 86_400_000;
    const candidates = entrees.filter((e) => e.date.getTime() >= limite);
    // Doublons : même adresse canonique, ou même titre (empreinte) déjà reçu d'une autre source récemment.
    const [parUrl, parEmpreinte] = await Promise.all([
      prisma.actualiteVeille.findMany({ where: { urlCanonique: { in: candidates.map((e) => e.urlCanonique) } }, select: { urlCanonique: true } }),
      prisma.actualiteVeille.findMany({
        where: { empreinte: { in: candidates.map((e) => e.empreinte) }, creeLe: { gt: new Date(Date.now() - 14 * 86_400_000) } },
        select: { empreinte: true },
      }),
    ]);
    const vues = new Set([...parUrl.map((x) => x.urlCanonique), ...parEmpreinte.map((x) => x.empreinte)]);
    const nouvelles = [];
    let ignorees = entrees.length - candidates.length;
    for (const e of candidates) {
      if (vues.has(e.urlCanonique) || vues.has(e.empreinte)) {
        ignorees++;
        continue;
      }
      vues.add(e.urlCanonique);
      vues.add(e.empreinte);
      const { categories: trouvees, technologique } = classerCategories(e.titre, e.extrait, cats);
      // Média généraliste : seules les actualités technologiques sont retenues.
      if (source.filtrerTech && !technologique) {
        ignorees++;
        continue;
      }
      const categoriesFinales = trouvees.length ? trouvees : source.categorieParDefaut ? [source.categorieParDefaut] : [];
      nouvelles.push({
        sourceId: source.id,
        titre: e.titre,
        extrait: e.extrait,
        url: e.url,
        urlCanonique: e.urlCanonique,
        empreinte: e.empreinte,
        imageUrl: e.imageUrl,
        langue: source.langue,
        datePublication: e.date,
        categories: categoriesFinales,
        zone: classerZone(e.titre, e.extrait, source.zoneParDefaut) as ZoneVeille,
        // Première collecte d'une source : on n'envoie pas de notifications pour tout l'historique du flux.
        notifiee: premiereCollecte,
      });
    }
    const r = nouvelles.length ? await prisma.actualiteVeille.createMany({ data: nouvelles, skipDuplicates: true }) : { count: 0 };
    await prisma.sourceVeille.update({
      where: { id: source.id },
      data: { dernierReleve: new Date(), dernierStatut: "ok", derniereErreur: null, derniersAjouts: r.count, echecsConsecutifs: 0 },
    });
    return { source: source.nom, ajoutees: r.count, ignorees };
  } catch (e) {
    const message = e instanceof ErreurFlux ? e.message : "Erreur technique pendant la lecture du flux.";
    if (!(e instanceof ErreurFlux)) console.error(`Veille — source ${source.nom} :`, e);
    await prisma.sourceVeille.update({
      where: { id: source.id },
      data: { dernierReleve: new Date(), dernierStatut: "erreur", derniereErreur: message, derniersAjouts: 0, echecsConsecutifs: { increment: 1 } },
    });
    return { source: source.nom, ajoutees: 0, ignorees: 0, erreur: message };
  }
}

/** Collecte toutes les sources actives (ou celles indiquées), puis notifie et nettoie. */
export async function collecterVeille(sourceIds?: string[]) {
  const debut = Date.now();
  const sources = await prisma.sourceVeille.findMany({ where: { actif: true, ...(sourceIds ? { id: { in: sourceIds } } : {}) }, select: { id: true } });
  const cats = await categoriesActives();
  const bilans: BilanSource[] = [];
  // Traitement par petits lots en parallèle ; allSettled : aucune source ne bloque les autres.
  for (let i = 0; i < sources.length; i += PARALLELE) {
    const lot = await Promise.allSettled(sources.slice(i, i + PARALLELE).map((s) => collecterSource(s.id, cats)));
    for (const r of lot) bilans.push(r.status === "fulfilled" ? r.value : { source: "?", ajoutees: 0, ignorees: 0, erreur: String(r.reason) });
  }
  const notifications = await notifierVeille().catch((e) => {
    console.error("Veille — notifications :", e);
    return { abonnes: 0, envoyees: 0 };
  });
  await prisma.actualiteVeille.deleteMany({ where: { datePublication: { lt: new Date(Date.now() - CONSERVATION_JOURS * 86_400_000) } } });
  const ajoutees = bilans.reduce((s, b) => s + b.ajoutees, 0);
  if (ajoutees) revalidateTag(TAG_VEILLE, { expire: 0 });
  return { duree: Date.now() - debut, ajoutees, sources: bilans, notifications };
}
