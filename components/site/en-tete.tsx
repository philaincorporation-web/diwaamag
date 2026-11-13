"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Languages, Mail, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { ReseauxSociaux } from "@/components/site/reseaux";
import { BoutonTheme } from "@/components/site/theme";
import { MeteoCompacte } from "@/components/site/meteo";
import { useLangue } from "@/components/i18n/contexte";
import { cheminSansLangue, formatDate, lien, type Langue } from "@/lib/i18n";
import { useValeurNavigateur } from "@/lib/hooks";
import { cn } from "@/lib/cn";

type RubriqueNav = { nom: string; slug: string; famille: "GEOGRAPHIQUE" | "THEMATIQUE" };
type ProprietesEnTete = { rubriques: RubriqueNav[]; numeroCourant?: { titre: string; slug: string } | null };

function DateDuJour({ lang }: { lang: Langue }) {
  // Date lue dans le navigateur : la page reste pré-rendue de façon statique.
  const texte = useValeurNavigateur(() => formatDate(lang, new Date(), "jour"), "");
  return <span className="hidden min-w-40 md:inline">{texte}</span>;
}

/** Lien vers la même page dans l'autre langue. */
function ChoixLangue({ chemin, className }: { chemin: string; className?: string }) {
  const { lang, t } = useLangue();
  const autre: Langue = lang === "fr" ? "en" : "fr";
  const cible = lien(autre, chemin ? cheminSansLangue(chemin).reste : "/");
  return (
    <Link
      href={cible}
      hrefLang={autre}
      lang={autre}
      aria-label={`${t.langue} : ${t.autreLangue}`}
      title={t.autreLangue}
      className={cn("inline-flex items-center gap-1 font-semibold uppercase hover:text-or", className)}
    >
      <Languages className="size-4" aria-hidden />
      <span className={cn(lang === "fr" && "text-or")}>FR</span>
      <span aria-hidden className="text-white/40">/</span>
      <span className={cn(lang === "en" && "text-or")}>EN</span>
    </Link>
  );
}

/** En-tête qui connaît la page courante (rubrique active, fermeture du menu, langue). À placer dans <Suspense>. */
export function EnTeteNavigation(props: ProprietesEnTete) {
  return <EnTete {...props} chemin={usePathname()} />;
}

/** En-tête complet ; sans chemin, il sert de version statique pré-rendue. */
export function EnTete({ rubriques, numeroCourant, chemin = "" }: ProprietesEnTete & { chemin?: string }) {
  const { lang, t } = useLangue();
  const L = (p: string) => lien(lang, p);
  const reste = chemin ? cheminSansLangue(chemin).reste : "";
  // Le menu mobile se referme de lui-même au changement de page (il reste lié à la page où il a été ouvert).
  const [ouvertSur, setOuvertSur] = useState<string | null>(null);
  const ouvert = ouvertSur === chemin;
  const setOuvert = (v: boolean) => setOuvertSur(v ? chemin : null);
  const [compact, setCompact] = useState(false);
  const geo = rubriques.filter((r) => r.famille === "GEOGRAPHIQUE");
  const themes = rubriques.filter((r) => r.famille === "THEMATIQUE");

  useEffect(() => {
    const surDefilement = () => setCompact(window.scrollY > 180);
    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, []);
  useEffect(() => {
    document.body.style.overflow = ouvert ? "hidden" : "";
  }, [ouvert]);

  const actif = (p: string) => reste === p || reste.startsWith(p + "/");

  return (
    <>
      {/* Barre supérieure : date, météo, liens, langue, réseaux */}
      <div className="relative z-50 bg-noir text-[12px] text-white/75">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <DateDuJour lang={lang} />
            <span className="hidden h-3 w-px bg-white/20 md:block" />
            <MeteoCompacte />
            <span className="hidden h-3 w-px bg-white/20 lg:block" />
            <Link href={L("/a-propos")} className="hidden hover:text-or lg:block">{t.aPropos}</Link>
            <Link href={L("/contact")} className="hidden hover:text-or lg:block">{t.contact}</Link>
          </div>
          <div className="flex items-center gap-4">
            <ReseauxSociaux className="hidden sm:flex" />
            <ChoixLangue chemin={chemin} />
            <Link href={`${L("/")}#newsletter`} className="hidden items-center gap-1.5 font-semibold text-or hover:text-white sm:inline-flex">
              <Mail className="size-3.5" aria-hidden /> {t.newsletter}
            </Link>
          </div>
        </div>
      </div>

      {/* Bandeau logo */}
      <div className="border-b border-ligne bg-fond">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:py-7">
          <Logo taille="md" href={L("/")} slogan={t.slogan} />
          <p className="hidden max-w-sm text-right font-serif text-sm italic leading-snug text-texte-doux lg:block">{t.accroche}</p>
          {numeroCourant && (
            <Link
              href={L(`/numeros/${numeroCourant.slug}`)}
              className="group hidden items-center gap-3 border border-ligne px-4 py-3 transition-colors hover:border-or md:flex"
            >
              <span className="font-titre text-xs uppercase tracking-[0.18em] text-or-fonce">{t.leNumero}</span>
              <span className="max-w-48 truncate text-sm font-semibold">{numeroCourant.titre.split("—")[0]}</span>
              <span className="text-or transition-transform group-hover:translate-x-1">→</span>
            </Link>
          )}
        </div>
      </div>

      {/* Navigation principale, collante */}
      <nav
        aria-label={lang === "fr" ? "Navigation principale" : "Main navigation"}
        className={cn("sticky top-0 z-40 bg-noir text-white transition-shadow", compact && "shadow-[0_6px_20px_rgba(0,0,0,0.25)]")}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
          <button type="button" onClick={() => setOuvert(true)} className="grid size-10 place-items-center hover:text-or lg:hidden" aria-label={t.ouvrirMenu} aria-expanded={ouvert}>
            <Menu className="size-6" />
          </button>
          <AnimatePresence>
            {compact && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="mr-3 hidden lg:block">
                <Logo clair taille="sm" href={L("/")} slogan={t.slogan} />
              </motion.div>
            )}
          </AnimatePresence>
          <ul className="hidden h-full items-stretch lg:flex">
            <LienNav href={L("/")} actif={reste === "/"}>{t.accueil}</LienNav>
            {geo.map((r) => (
              <LienNav key={r.slug} href={L(`/rubrique/${r.slug}`)} actif={actif(`/rubrique/${r.slug}`)}>{r.nom}</LienNav>
            ))}
            {themes.slice(0, compact ? 1 : 2).map((r) => (
              <LienNav key={r.slug} href={L(`/rubrique/${r.slug}`)} actif={actif(`/rubrique/${r.slug}`)}>{r.nom}</LienNav>
            ))}
            <LienNav href={L("/veille")} actif={actif("/veille")}>{t.veilleMedia}</LienNav>
            <li className="group relative flex">
              <button type="button" className="flex items-center px-3 font-titre text-[15px] uppercase tracking-[0.08em] hover:text-or">{t.plus}</button>
              <ul className="invisible absolute left-0 top-full min-w-56 translate-y-2 bg-fond py-2 text-encre opacity-0 shadow-xl transition-all group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                {themes.slice(compact ? 1 : 2).map((r) => (
                  <li key={r.slug}>
                    <Link href={L(`/rubrique/${r.slug}`)} className="block px-4 py-2 text-sm font-medium hover:bg-fond-2 hover:text-or-fonce">{r.nom}</Link>
                  </li>
                ))}
                <li><Link href={L("/videos")} className="block px-4 py-2 text-sm font-medium hover:bg-fond-2 hover:text-or-fonce">{t.videos}</Link></li>
                <li><Link href={L("/numeros")} className="block px-4 py-2 text-sm font-medium hover:bg-fond-2 hover:text-or-fonce">{t.numeros}</Link></li>
              </ul>
            </li>
          </ul>
          <div className="ml-auto flex items-center">
            <BoutonTheme />
            <Link href={L("/recherche")} className="grid size-10 place-items-center hover:text-or" aria-label={t.rechercher}>
              <Search className="size-5" />
            </Link>
          </div>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-or via-or-clair to-or" />
      </nav>

      {/* Menu mobile */}
      <AnimatePresence>
        {ouvert && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label={t.fermerMenu} className="absolute inset-0 bg-black/60" onClick={() => setOuvert(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-noir text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <Logo clair taille="sm" href={L("/")} slogan={t.slogan} />
                <button type="button" onClick={() => setOuvert(false)} className="grid size-10 place-items-center hover:text-or" aria-label={t.fermerMenu}>
                  <X className="size-6" />
                </button>
              </div>
              <form action={L("/recherche")} className="border-b border-white/10 p-4">
                <label className="flex items-center gap-2 bg-white/10 px-3">
                  <Search className="size-4 text-white/60" aria-hidden />
                  <input name="q" placeholder={t.placeholderRecherche} aria-label={t.rechercher} className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-white/50" />
                </label>
              </form>
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-sm">
                <ChoixLangue chemin={chemin} />
                <BoutonTheme />
              </div>
              <div className="p-4">
                <p className="mb-2 font-titre text-xs uppercase tracking-[0.2em] text-or">{t.regions}</p>
                {geo.map((r) => <LienMobile key={r.slug} href={L(`/rubrique/${r.slug}`)}>{r.nom}</LienMobile>)}
                <p className="mb-2 mt-6 font-titre text-xs uppercase tracking-[0.2em] text-or">{t.thematiques}</p>
                {themes.map((r) => <LienMobile key={r.slug} href={L(`/rubrique/${r.slug}`)}>{r.nom}</LienMobile>)}
                <p className="mb-2 mt-6 font-titre text-xs uppercase tracking-[0.2em] text-or">{t.magazine}</p>
                <LienMobile href={L("/veille")}>{t.veilleMedia}</LienMobile>
                <LienMobile href={L("/videos")}>{t.videos}</LienMobile>
                <LienMobile href={L("/numeros")}>{t.anciensNumeros}</LienMobile>
                <LienMobile href={L("/a-propos")}>{t.aPropos}</LienMobile>
                <LienMobile href={L("/contact")}>{t.contact}</LienMobile>
              </div>
              <ReseauxSociaux className="mt-auto border-t border-white/10 p-4" />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function LienNav({ href, actif, children }: { href: string; actif: boolean; children: React.ReactNode }) {
  return (
    <li className="relative flex">
      <Link
        href={href}
        aria-current={actif ? "page" : undefined}
        className={cn("flex items-center whitespace-nowrap px-3 font-titre text-[15px] uppercase tracking-[0.08em] transition-colors hover:text-or", actif && "text-or")}
      >
        {children}
      </Link>
      {actif && <motion.span layoutId="nav-actif" className="absolute inset-x-3 bottom-0 h-[3px] bg-or" />}
    </li>
  );
}

function LienMobile({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block border-b border-white/5 py-3 font-titre text-lg uppercase tracking-wide hover:text-or">
      {children}
    </Link>
  );
}
