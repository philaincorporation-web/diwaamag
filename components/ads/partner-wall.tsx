"use client";
// HP-10 — Mur des partenaires : logos fixes (200 × 80, 160 × 64 sur mobile), grille centrée sur
// tablette et ordinateur, défilement horizontal sur mobile. Sans partenaire en cours : `repli`.

import Image from "next/image";
import { imageOptimisable } from "@/lib/images";
import { useLangue } from "@/components/i18n/contexte";
import type { PubliciteAffichee } from "@/lib/data";
import { SponsoredLabel } from "@/components/ads/sponsored-label";
import { enCours, texteAlt, useImpression, useTirage } from "@/components/ads/use-pub";

export function PartnerWall({ partners, repli = null }: { partners: PubliciteAffichee[]; repli?: React.ReactNode }) {
  const { lang, t: d } = useLangue();
  const t = useTirage();
  const visibles = t ? partners.filter((p) => enCours(p, t.maintenant)) : partners;
  const ref = useImpression<HTMLElement>(t ? visibles.map((p) => p.id) : []);
  if (!visibles.length) return repli ? <>{repli}</> : null;
  return (
    <section ref={ref} aria-label={d.nosPartenaires} className="encart border-t border-ligne bg-fond">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-titre text-sm uppercase tracking-[0.2em] text-encre">{d.nosPartenaires}</h2>
          <SponsoredLabel lang={lang} />
        </div>
        <ul className="-mx-4 flex snap-x snap-mandatory items-center gap-6 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:justify-center md:gap-x-10 md:gap-y-6 md:overflow-visible md:px-0 md:pb-0">
          {visibles.map((p) => (
            <li key={p.id} className="shrink-0 snap-start">
              <a
                href={`/api/pub/${p.id}/clic`}
                target="_blank"
                rel="sponsored noopener noreferrer"
                title={p.annonceur}
                className="grid h-16 w-40 place-items-center opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0 focus-visible:opacity-100 focus-visible:grayscale-0 focus-visible:outline-2 focus-visible:outline-or md:h-20 md:w-[200px]"
              >
                <Image
                  src={p.imageUrl}
                  unoptimized={!imageOptimisable(p.imageUrl)}
                  alt={texteAlt(p, lang) || p.annonceur}
                  width={400}
                  height={160}
                  sizes="200px"
                  loading="lazy"
                  className="max-h-full w-auto max-w-full object-contain"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
