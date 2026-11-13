// Notifications Web Push de la Veille Média, ciblées selon les préférences de chaque abonnement.
// Une notification n'est jamais envoyée deux fois pour la même actualité au même abonnement
// (clé unique abonnement + actualité dans NotificationVeille).
import "server-only";
import { prisma } from "@/lib/db";
import { configurerPush, envoyerPush } from "@/lib/services";
import { zonesDuFiltre } from "./classement";
import type { ZoneVeilleCle } from "./defauts";

const FRAICHEUR_H = 48; // seules les actualités récentes déclenchent une notification
const MAX_INDIVIDUELLES = 2; // au-delà, une seule notification groupée par abonnement et par collecte

type Actu = { id: string; titre: string; categories: string[]; zone: ZoneVeilleCle; imageUrl: string | null };

export function correspond(actu: Actu, prefs: { categoriesVeille: string[]; zonesVeille: ZoneVeilleCle[] }) {
  const okCategorie = !prefs.categoriesVeille.length || actu.categories.some((c) => prefs.categoriesVeille.includes(c));
  const okZone = !prefs.zonesVeille.length || prefs.zonesVeille.some((z) => zonesDuFiltre(z).includes(actu.zone));
  return okCategorie && okZone;
}

export async function notifierVeille() {
  const enAttente = await prisma.actualiteVeille.findMany({
    where: { notifiee: false },
    select: { id: true, titre: true, categories: true, zone: true, imageUrl: true, masquee: true, datePublication: true },
    orderBy: { datePublication: "desc" },
    take: 200,
  });
  if (!enAttente.length) return { abonnes: 0, envoyees: 0 };
  const limite = Date.now() - FRAICHEUR_H * 3_600_000;
  const actus = enAttente.filter((a) => !a.masquee && a.datePublication.getTime() >= limite).slice(0, 50) as (Actu & { masquee: boolean })[];
  let envoyees = 0;
  let abonnes = 0;

  if (actus.length && configurerPush()) {
    const abonnements = await prisma.abonnementPush.findMany({ where: { veille: true } });
    const deja = await prisma.notificationVeille.findMany({
      where: { actualiteId: { in: actus.map((a) => a.id) }, abonnementId: { in: abonnements.map((a) => a.id) } },
      select: { abonnementId: true, actualiteId: true },
    });
    const dejaVu = new Set(deja.map((d) => `${d.abonnementId}:${d.actualiteId}`));
    for (const ab of abonnements) {
      const pour = actus.filter((a) => !dejaVu.has(`${ab.id}:${a.id}`) && correspond(a, { categoriesVeille: ab.categoriesVeille, zonesVeille: ab.zonesVeille as ZoneVeilleCle[] }));
      if (!pour.length) continue;
      abonnes++;
      const lang = ab.langue === "en" ? "en" : "fr";
      // Réservation avant l'envoi : une collecte concurrente ne renverra pas la même notification.
      const reserve = await prisma.notificationVeille.createMany({
        data: pour.map((a) => ({ abonnementId: ab.id, actualiteId: a.id })),
        skipDuplicates: true,
      });
      if (!reserve.count) continue;
      let ok: boolean;
      if (pour.length <= MAX_INDIVIDUELLES) {
        ok = true;
        for (const a of pour) {
          const r = await envoyerPush(ab, { title: "DIWA Magazine", body: a.titre, url: `/${lang}/veille/${a.id}`, image: a.imageUrl, tag: `veille-${a.id}`, type: "veille" });
          ok = ok && r;
          if (r) envoyees++;
        }
      } else {
        const body = lang === "en" ? `${pour.length} new stories in your topics — ${pour[0].titre}` : `${pour.length} nouvelles actualités dans vos thèmes — ${pour[0].titre}`;
        ok = await envoyerPush(ab, { title: "DIWA Magazine", body, url: `/${lang}/veille`, tag: "veille-groupe", type: "veille" });
        if (ok) envoyees++;
      }
      if (!ok) {
        await prisma.notificationVeille.updateMany({ where: { abonnementId: ab.id, actualiteId: { in: pour.map((a) => a.id) } }, data: { envoyee: false } }).catch(() => {});
      }
    }
  }
  await prisma.actualiteVeille.updateMany({ where: { id: { in: enAttente.map((a) => a.id) } }, data: { notifiee: true } });
  return { abonnes, envoyees };
}
