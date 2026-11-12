"use client";
// Affichage des publicités : choix d'une campagne par rotation pondérée (dans le navigateur, pour
// que les pages restent en cache), mention « Publicité », comptage des affichages réellement vus.

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { imageOptimisable } from "@/lib/images";
import { useLangue } from "@/components/i18n/contexte";
import type { PubliciteAffichee } from "@/lib/data";

/** Tirage fixé pour toute la page (même campagne entre deux rendus), calculé côté navigateur. */
let tirage: { hasard: number; maintenant: number } | null = null;
const lireTirage = () => (tirage ??= { hasard: Math.random(), maintenant: Date.now() });
const sAbonner = () => () => {};

function useTirage() {
  return useSyncExternalStore(sAbonner, lireTirage, () => null);
}

const enCours = (p: PubliciteAffichee, maintenant: number) => (!p.debut || p.debut <= maintenant) && (!p.fin || p.fin > maintenant);

function choisir(pubs: PubliciteAffichee[], hasard: number, maintenant: number, decalage = 0) {
  const valides = pubs.filter((p) => enCours(p, maintenant));
  if (!valides.length) return null;
  const total = valides.reduce((s, p) => s + p.poids, 0);
  let cible = ((hasard + decalage * 0.618) % 1) * total;
  for (const p of valides) {
    cible -= p.poids;
    if (cible < 0) return p;
  }
  return valides[0];
}

/** Envoie un « affichage » quand l'élément est visible à au moins 50 %, une seule fois. */
function useAffichage(ids: string[]) {
  const ref = useRef<HTMLDivElement>(null);
  const cle = ids.join(",");
  useEffect(() => {
    const el = ref.current;
    if (!el || !cle) return;
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          for (const id of cle.split(",")) navigator.sendBeacon?.(`/api/pub/${id}/vue`);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cle]);
  return ref;
}

function Mention({ className }: { className?: string }) {
  const { t } = useLangue();
  return <span className={cn("font-titre text-[10px] uppercase tracking-[0.18em] text-texte-doux", className)}>{t.publicite}</span>;
}

/**
 * Une bannière choisie parmi les campagnes de l'emplacement.
 * `format` : « banniere » (large) ou « pave » (barre latérale, carré ou portrait).
 * `decalage` : différencie plusieurs bannières du même emplacement sur une même page.
 */
export function BannierePub({ pubs, format = "banniere", decalage = 0, className }: { pubs: PubliciteAffichee[]; format?: "banniere" | "pave"; decalage?: number; className?: string }) {
  const t = useTirage();
  const pub = t ? choisir(pubs, t.hasard, t.maintenant, decalage) : null;
  const ref = useAffichage(pub ? [pub.id] : []);
  if (!t) return <div aria-hidden className={cn(format === "banniere" ? "min-h-12" : "min-h-40", className)} />;
  if (!pub) return null;
  return (
    <div ref={ref} className={className}>
      <div className="mb-1 flex justify-end">
        <Mention />
      </div>
      <a
        href={`/api/pub/${pub.id}/clic`}
        target="_blank"
        rel="sponsored noopener"
        className="group block overflow-hidden ring-1 ring-ligne transition duration-300 hover:shadow-lg hover:ring-or/60 motion-safe:hover:-translate-y-0.5"
      >
        <Image
          src={pub.imageUrl}
          unoptimized={!imageOptimisable(pub.imageUrl)}
          alt={pub.imageAlt}
          width={format === "banniere" ? 1600 : 600}
          height={format === "banniere" ? 200 : 600}
          sizes={format === "banniere" ? "(min-width: 1280px) 1248px, 100vw" : "300px"}
          className={cn(
            "h-auto w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.02]",
            // Garde-fou si l'image n'a pas le format conseillé : hauteur plafonnée, image recadrée.
            format === "banniere" ? "max-h-60" : "max-h-[600px]",
          )}
        />
      </a>
    </div>
  );
}

/** Mur de logos des partenaires (toutes les campagnes en cours de l'emplacement SPONSORS). */
export function MurSponsors({ pubs }: { pubs: PubliciteAffichee[] }) {
  const { t: dicoT } = useLangue();
  const t = useTirage();
  const visibles = t ? pubs.filter((p) => enCours(p, t.maintenant)) : [];
  const ref = useAffichage(visibles.map((p) => p.id));
  if (!visibles.length) return null;
  return (
    <section ref={ref} aria-label={dicoT.nosPartenaires} className="border-t border-ligne bg-fond">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-titre text-sm uppercase tracking-[0.2em] text-encre">{dicoT.nosPartenaires}</h2>
          <Mention />
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {visibles.map((p) => (
            <li key={p.id}>
              <a href={`/api/pub/${p.id}/clic`} target="_blank" rel="sponsored noopener" title={p.annonceur} className="block opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0">
                <Image src={p.imageUrl} unoptimized={!imageOptimisable(p.imageUrl)} alt={p.imageAlt || p.annonceur} width={200} height={80} sizes="160px" className="h-12 w-auto max-w-40 object-contain" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
