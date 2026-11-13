import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { BellRing, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { lien, type Langue } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { cn } from "@/lib/cn";
import { EnTetePage, SqueletteListe } from "@/components/site/liste";
import { CarteVeille } from "@/components/site/veille";
import { NouveautesVeille } from "@/components/site/veille-client";
import { estZone, getActualitesVeille, getCategoriesVeille, type FiltresVeille } from "@/lib/veille/donnees";
import { ZONES, type ZoneVeilleCle } from "@/lib/veille/defauts";
import { textesVeille } from "@/lib/veille/textes";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: PageProps<"/[lang]/veille">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  const t = textesVeille(lang);
  return { title: t.menu, description: t.description, alternates: alternates(lang, "/veille") };
}

export default async function PageVeille({ params, searchParams }: PageProps<"/[lang]/veille">) {
  const lang = langueParams((await params).lang);
  const t = textesVeille(lang);
  const categories = await getCategoriesVeille();
  return (
    <>
      <EnTetePage surtitre={t.surtitre} titre={t.titre} description={t.description} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="mb-6 flex justify-end">
          <Link href={lien(lang, "/veille/preferences")} className="inline-flex items-center gap-2 text-sm font-semibold text-or-fonce hover:text-encre">
            <BellRing className="size-4" aria-hidden /> {t.notifications}
          </Link>
        </div>
        <Suspense fallback={<Filtres lang={lang} categories={categories} f={{}} />}>
          <FiltresAvecValeurs searchParams={searchParams} lang={lang} categories={categories} />
        </Suspense>
        <Suspense fallback={<SqueletteListe />}>
          <Resultats searchParams={searchParams} lang={lang} categories={categories} />
        </Suspense>
      </div>
    </>
  );
}

function lireFiltres(sp: Record<string, string | string[] | undefined>): FiltresVeille {
  const un = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const zone = un("zone");
  return {
    categorie: un("categorie") || undefined,
    zone: estZone(zone) ? zone : undefined,
    q: un("q")?.slice(0, 100) || undefined,
    ordre: un("ordre") === "ancien" ? "ancien" : "recent",
    page: Math.max(1, Number(un("page")) || 1),
  };
}

function Filtres({ lang, categories, f }: { lang: Langue; categories: { slug: string; nom: string; nomEn: string }[]; f: FiltresVeille }) {
  const t = textesVeille(lang);
  const champ = "h-10 w-full border border-ligne bg-fond px-3 text-sm outline-none focus:border-or";
  const actif = Boolean(f.categorie || f.zone || f.q || f.ordre === "ancien");
  return (
    <Form action={lien(lang, "/veille")} className="mb-8 grid gap-3 border border-ligne bg-fond-2 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]" role="search">
      <label className="block text-xs font-semibold uppercase tracking-wide text-texte-doux">
        {t.rechercher}
        <input name="q" defaultValue={f.q} placeholder={t.placeholder} className={cn(champ, "mt-1 normal-case tracking-normal")} />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-texte-doux">
        {t.categorie}
        <select name="categorie" defaultValue={f.categorie ?? ""} className={cn(champ, "mt-1 normal-case tracking-normal")}>
          <option value="">{t.toutes}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{lang === "en" ? c.nomEn : c.nom}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-texte-doux">
        {t.zone}
        <select name="zone" defaultValue={f.zone ?? ""} className={cn(champ, "mt-1 normal-case tracking-normal")}>
          <option value="">{t.toutesZones}</option>
          {(Object.keys(ZONES) as ZoneVeilleCle[]).map((z) => (
            <option key={z} value={z}>{ZONES[z][lang]}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-texte-doux">
        {t.tri}
        <select name="ordre" defaultValue={f.ordre ?? "recent"} className={cn(champ, "mt-1 normal-case tracking-normal")}>
          <option value="recent">{t.recent}</option>
          <option value="ancien">{t.ancien}</option>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button className="inline-flex h-10 items-center gap-2 bg-noir px-4 text-sm font-semibold text-white hover:bg-or hover:text-noir">
          <Search className="size-4" aria-hidden /> {t.filtrer}
        </button>
        {actif && (
          <Link href={lien(lang, "/veille")} className="inline-flex h-10 items-center text-xs font-semibold text-texte-doux underline">
            {t.effacer}
          </Link>
        )}
      </div>
    </Form>
  );
}

async function FiltresAvecValeurs({ searchParams, lang, categories }: { searchParams: Recherche; lang: Langue; categories: { slug: string; nom: string; nomEn: string }[] }) {
  return <Filtres lang={lang} categories={categories} f={lireFiltres(await searchParams)} />;
}

async function Resultats({ searchParams, lang, categories }: { searchParams: Recherche; lang: Langue; categories: { slug: string; nom: string; nomEn: string }[] }) {
  const t = textesVeille(lang);
  const f = lireFiltres(await searchParams);
  const { actualites, total, pages } = await getActualitesVeille(f);
  const noms = new Map(categories.map((c) => [c.slug, lang === "en" ? c.nomEn : c.nom]));
  const url = (p: number) => {
    const q = new URLSearchParams();
    if (f.q) q.set("q", f.q);
    if (f.categorie) q.set("categorie", f.categorie);
    if (f.zone) q.set("zone", f.zone);
    if (f.ordre === "ancien") q.set("ordre", "ancien");
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return lien(lang, `/veille${s ? `?${s}` : ""}`);
  };
  const page = f.page ?? 1;
  return (
    <>
      {page === 1 && f.ordre !== "ancien" && <NouveautesVeille depuis={new Date().toISOString()} />}
      <p className="mb-4 text-sm text-texte-doux">{t.resultats(total)}</p>
      {actualites.length === 0 ? (
        <p className="border border-dashed border-ligne p-10 text-center text-texte-doux">{t.aucune}</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {actualites.map((a) => (
            <li key={a.id}>
              <CarteVeille a={a} lang={lang} nomsCategories={noms} />
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label={t.pagination} className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link href={url(page - 1)} className="grid size-10 place-items-center border border-ligne hover:border-or" aria-label="←">
              <ChevronLeft className="size-4" />
            </Link>
          )}
          <span className="font-titre text-sm">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link href={url(page + 1)} className="grid size-10 place-items-center border border-ligne hover:border-or" aria-label="→">
              <ChevronRight className="size-4" />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
