"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { useValeurNavigateur } from "@/lib/hooks";
import { useLangue } from "@/components/i18n/contexte";
import { lien } from "@/lib/i18n";

/**
 * Apparition progressive au défilement.
 * Le contenu est visible par défaut (HTML serveur, JavaScript lent ou désactivé) : seuls les éléments
 * situés sous la ligne de flottaison sont masqués après l'hydratation, puis révélés à l'approche.
 */
export function Apparition({
  children,
  delai = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delai?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [etat, setEtat] = useState<"visible" | "cache" | "revele">("visible");
  const reduit = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduit || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // déjà à l'écran : on ne touche à rien
    setEtat("cache");
    const obs = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setEtat("revele");
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -60px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduit]);

  const Tag = as;
  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(
        className,
        etat !== "visible" && "transition-[opacity,transform] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        etat === "cache" && "translate-y-6 opacity-0",
      )}
      style={etat === "revele" ? { transitionDelay: `${delai}s` } : undefined}
    >
      {children}
    </Tag>
  );
}

/** Micro-interaction : légère élévation au survol. */
export function Elevation({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      {children}
    </motion.div>
  );
}

type Titre = { titre: string; slug: string };

/** Bandeau défilant des derniers titres. */
export function BandeauDefilant({ titres }: { titres: Titre[] }) {
  const { lang, t: dico } = useLangue();
  if (titres.length === 0) return null;
  const liste = [...titres, ...titres];
  return (
    <div className="border-b border-ligne bg-fond">
      <div className="mx-auto flex h-11 max-w-7xl items-center gap-4 px-4">
        <span className="flex shrink-0 items-center gap-1.5 bg-or px-3 py-1.5 font-titre text-xs font-semibold uppercase tracking-[0.16em] text-noir">
          <Zap className="size-3.5" aria-hidden /> {dico.aLaUne}
        </span>
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
          <ul className="ticker-piste flex w-max gap-10">
            {liste.map((t, i) => (
              <li key={`${t.slug}-${i}`} aria-hidden={i >= titres.length} className="whitespace-nowrap text-sm font-medium">
                <Link href={lien(lang, `/article/${t.slug}`)} tabIndex={i >= titres.length ? -1 : undefined} className="hover:text-or-fonce">
                  <span className="mr-3 inline-block size-1.5 -translate-y-0.5 rotate-45 bg-or" aria-hidden />
                  {t.titre}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

type Diapo = {
  titre: string;
  slug: string;
  chapeau: string;
  imageUneUrl: string | null;
  imageUneAlt: string | null;
  rubrique: { nom: string; slug: string };
  auteur: string;
  date: string;
};

/** Carrousel animé « À la une ». */
export function CarrouselUne({ diapos }: { diapos: Diapo[] }) {
  const { lang, t: dico } = useLangue();
  const [index, setIndex] = useState(0);
  const [pause, setPause] = useState(false);
  const reduit = useReducedMotion();
  const total = diapos.length;
  const aller = useCallback((i: number) => setIndex(((i % total) + total) % total), [total]);

  useEffect(() => {
    if (pause || reduit || total < 2) return;
    const t = setTimeout(() => aller(index + 1), 7000);
    return () => clearTimeout(t);
  }, [index, pause, reduit, total, aller]);

  if (total === 0) return null;
  const d = diapos[index];

  return (
    <section
      aria-roledescription={lang === "fr" ? "carrousel" : "carousel"}
      aria-label={dico.aLaUne}
      className="relative h-[460px] overflow-hidden bg-noir sm:h-[540px]"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onFocusCapture={() => setPause(true)}
      onBlurCapture={() => setPause(false)}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={d.slug}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {d.imageUneUrl && (
            <Image src={d.imageUneUrl} alt={d.imageUneAlt || d.titre} fill preload={index === 0} sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover object-top" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/5" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 p-5 pb-16 sm:p-9 sm:pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={d.slug}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            aria-live="polite"
          >
            <Link
              href={lien(lang, `/rubrique/${d.rubrique.slug}`)}
              className="inline-block bg-or px-2 py-1 font-titre text-[11px] font-semibold uppercase tracking-[0.14em] text-noir hover:bg-white"
            >
              {d.rubrique.nom}
            </Link>
            <h2 className="mt-4 max-w-3xl font-titre text-3xl font-bold uppercase leading-[1.05] text-white sm:text-5xl">
              <Link href={lien(lang, `/article/${d.slug}`)} className="hover:text-or">{d.titre}</Link>
            </h2>
            <p className="mt-4 hidden max-w-2xl text-base text-white/85 sm:line-clamp-2">{d.chapeau}</p>
            <p className="mt-4 text-xs font-medium text-white/70">
              {dico.par} <span className="font-semibold text-white">{d.auteur}</span> · {d.date}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {total > 1 && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 px-5 pb-5 sm:px-9">
          <div className="flex gap-2" role="tablist" aria-label={lang === "fr" ? "Choisir un article" : "Choose a story"}>
            {diapos.map((x, i) => (
              <button
                key={x.slug}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Article ${i + 1} : ${x.titre}`}
                onClick={() => aller(i)}
                className="relative h-1 w-10 overflow-hidden bg-white/25"
              >
                {i === index && (
                  <motion.span
                    key={`${index}-${pause}`}
                    className="absolute inset-y-0 left-0 bg-or"
                    initial={{ width: pause || reduit ? "100%" : "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: pause || reduit ? 0 : 7, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <BoutonFleche onClick={() => aller(index - 1)} label={lang === "fr" ? "Article précédent" : "Previous story"}><ChevronLeft className="size-5" /></BoutonFleche>
            <BoutonFleche onClick={() => aller(index + 1)} label={lang === "fr" ? "Article suivant" : "Next story"}><ChevronRight className="size-5" /></BoutonFleche>
          </div>
        </div>
      )}
    </section>
  );
}

function BoutonFleche({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      className="grid size-10 place-items-center border border-white/30 text-white transition-colors hover:border-or hover:bg-or hover:text-noir"
    >
      {children}
    </motion.button>
  );
}

/** Écran de chargement animé aux couleurs DIWAA (une fois par session). */
let premiereVisite: boolean | null = null;
function estPremiereVisite() {
  if (premiereVisite === null) {
    try {
      // Pas d'écran de chargement pour les robots, tests et captures automatisées.
      premiereVisite = !navigator.webdriver && !sessionStorage.getItem("diwa-splash");
      sessionStorage.setItem("diwa-splash", "1");
    } catch {
      premiereVisite = false;
    }
  }
  return premiereVisite;
}

export function EcranChargement() {
  const afficher = useValeurNavigateur(estPremiereVisite, false);
  const [termine, setTermine] = useState(false);
  useEffect(() => {
    if (!afficher) return;
    const t = setTimeout(() => setTermine(true), 1500);
    return () => clearTimeout(t);
  }, [afficher]);
  const visible = afficher && !termine;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-noir"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          aria-hidden
        >
          <div className="text-center">
            <motion.p
              className="font-titre text-7xl font-bold uppercase text-white"
              initial={{ letterSpacing: "0.6em", opacity: 0 }}
              animate={{ letterSpacing: "0.02em", opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              DIW<span className="text-or">A</span>
            </motion.p>
            <motion.div className="mx-auto mt-4 h-1 bg-or" initial={{ width: 0 }} animate={{ width: 180 }} transition={{ duration: 0.9, delay: 0.3 }} />
            <motion.p
              className="mt-4 font-titre text-sm uppercase tracking-[0.4em] text-or"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Mag
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Onglets animés de filtrage par rubrique (bloc « Dossiers »). */
export function OngletsRubriques({
  onglets,
}: {
  onglets: { cle: string; libelle: string; contenu: React.ReactNode }[];
}) {
  const { lang } = useLangue();
  const [actif, setActif] = useState(onglets[0]?.cle);
  const courant = onglets.find((o) => o.cle === actif) ?? onglets[0];
  return (
    <div>
      <div role="tablist" aria-label={lang === "fr" ? "Filtrer par rubrique" : "Filter by section"} className="scrollbar-fine -mx-4 mb-6 flex gap-1 overflow-x-auto px-4">
        {onglets.map((o) => (
          <button
            key={o.cle}
            role="tab"
            type="button"
            aria-selected={o.cle === actif}
            onClick={() => setActif(o.cle)}
            className={cn(
              "relative shrink-0 px-4 py-2 font-titre text-sm uppercase tracking-[0.1em] transition-colors",
              o.cle === actif ? "text-encre" : "text-texte-doux hover:text-encre",
            )}
          >
            {o.cle === actif && <motion.span layoutId="onglet-actif" className="absolute inset-0 -z-0 bg-or" />}
            <span className="relative">{o.libelle}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={courant?.cle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          {courant?.contenu}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
