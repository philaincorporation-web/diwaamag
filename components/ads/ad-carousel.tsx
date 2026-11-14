"use client";
// Billboard HP-01 : la campagne interne permanente (visuel DigieWomen Awards, `maison`) et jusqu'à
// `maxItems - 1` campagnes d'annonceurs, en rotation toutes les `interval` ms.
// Pause au survol, au focus clavier et par le bouton ; aucune rotation automatique si l'utilisateur
// a demandé de réduire les animations ; flèches et points utilisables au clavier.

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLangue } from "@/components/i18n/contexte";
import type { PubliciteAffichee } from "@/lib/data";
import { CADRES, LARGEURS } from "@/components/ads/cadres";
import { Creation } from "@/components/ads/creation";
import { libelleMention } from "@/components/ads/sponsored-label";
import { choisirPlusieurs, texteAlt, useImpression, useMouvementReduit, useTirage } from "@/components/ads/use-pub";

const bouton =
  "grid size-7 place-items-center rounded-full text-texte-doux transition hover:bg-fond-2 hover:text-encre focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-or";

export function AdCarousel({
  pubs,
  maison,
  interval = 7000,
  maxItems = 3,
  className,
}: {
  pubs: PubliciteAffichee[];
  maison: React.ReactNode;
  interval?: number;
  maxItems?: number;
  className?: string;
}) {
  const { lang, t: d } = useLangue();
  const t = useTirage();
  const reduit = useMouvementReduit();
  const campagnes = t ? choisirPlusieurs(pubs, t.hasard, t.maintenant, maxItems - 1) : [];
  const [erreurs, setErreurs] = useState<string[]>([]);
  const annonces = campagnes.filter((p) => !erreurs.includes(p.id));
  const total = 1 + annonces.length;

  const [index, setIndex] = useState(0);
  const [pauseUtilisateur, setPauseUtilisateur] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [focus, setFocus] = useState(false);
  const courant = index % total;
  const enPause = pauseUtilisateur || survol || focus || reduit;

  useEffect(() => {
    if (enPause || total < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % total), interval);
    return () => window.clearInterval(id);
  }, [enPause, total, interval]);

  const pubCourante = courant > 0 ? annonces[courant - 1] : null;
  const ref = useImpression(pubCourante ? [pubCourante.id] : []);
  const aller = (pas: number) => setIndex((i) => (((i % total) + pas) % total + total) % total);

  return (
    <section
      ref={ref}
      aria-roledescription="carousel"
      aria-label={d.carrouselPub}
      className={cn("encart", className)}
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
      }}
    >
      <div className={cn(LARGEURS.billboard, "mb-1.5 flex h-7 items-center justify-between gap-3")}>
        <span className="font-titre text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-or-fonce">
          {libelleMention(pubCourante ? "ad" : "maison", lang)}
        </span>
        {total > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => aller(-1)} className={bouton} aria-label={d.annoncePrecedente}>
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setPauseUtilisateur((p) => !p)}
              className={bouton}
              aria-label={pauseUtilisateur || reduit ? d.reprendreDefilement : d.pauseDefilement}
              aria-pressed={pauseUtilisateur}
              disabled={reduit}
            >
              {pauseUtilisateur || reduit ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
            </button>
            <button type="button" onClick={() => aller(1)} className={bouton} aria-label={d.annonceSuivante}>
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <div className="ml-1 hidden gap-1.5 sm:flex">
              {Array.from({ length: total }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={d.annonceNumero.replace("{n}", String(i + 1)).replace("{total}", String(total))}
                  aria-current={i === courant}
                  className={cn("h-1.5 rounded-full transition-all", i === courant ? "w-5 bg-or" : "w-1.5 bg-ligne hover:bg-texte-doux")}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div aria-live={enPause ? "polite" : "off"} className={cn(CADRES.billboard, "relative overflow-hidden bg-fond-2 ring-1 ring-ligne")}>
        {/* Diapositive 1 : campagne interne permanente */}
        <Diapositive actif={courant === 0} n={1} total={total}>
          {maison}
        </Diapositive>
        {annonces.map((p, i) => (
          <Diapositive key={p.id} actif={courant === i + 1} n={i + 2} total={total}>
            <a
              href={`/api/pub/${p.id}/clic`}
              target="_blank"
              rel="sponsored noopener noreferrer"
              title={p.annonceur}
              aria-label={texteAlt(p, lang)}
              className="block size-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-or"
            >
              <Creation pub={p} forme="billboard" lang={lang} onErreur={() => setErreurs((e) => [...e, p.id])} />
            </a>
          </Diapositive>
        ))}
      </div>
    </section>
  );
}

function Diapositive({ actif, n, total, children }: { actif: boolean; n: number; total: number; children: React.ReactNode }) {
  const { t } = useLangue();
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={t.annonceNumero.replace("{n}", String(n)).replace("{total}", String(total))}
      aria-hidden={!actif}
      inert={!actif}
      className={cn("absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none", actif ? "z-10 opacity-100" : "opacity-0")}
    >
      {children}
    </div>
  );
}
