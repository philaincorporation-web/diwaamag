import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { getDernieres, rechercher } from "@/lib/data";
import { dico, lien, pluriel, type Langue } from "@/lib/i18n";
import { langueParams } from "@/lib/seo";
import { BarreLaterale } from "@/components/site/barre-laterale";
import { EnTetePage, ListeArticles, SqueletteListe } from "@/components/site/liste";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: PageProps<"/[lang]/recherche">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  return { title: dico(lang).rechercheTitre, robots: { index: false } };
}

export default async function PageRecherche({ params, searchParams }: PageProps<"/[lang]/recherche">) {
  const lang = langueParams((await params).lang);
  const t = dico(lang);
  return (
    <>
      <EnTetePage surtitre={t.rechercher} titre={t.rechercheTitre} description={t.rechercheDescription} />
      <div className="mx-auto mt-10 grid max-w-7xl gap-12 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <Suspense fallback={<ChampRecherche lang={lang} />}>
            <ChampAvecValeur searchParams={searchParams} lang={lang} />
          </Suspense>
          <div className="mt-10">
            <Suspense fallback={<SqueletteListe />}>
              <Resultats searchParams={searchParams} lang={lang} />
            </Suspense>
          </div>
        </section>
        <BarreLaterale lang={lang} />
      </div>
    </>
  );
}

function ChampRecherche({ valeur = "", lang }: { valeur?: string; lang: Langue }) {
  const t = dico(lang);
  return (
    <Form action={lien(lang, "/recherche")} className="flex border-2 border-encre focus-within:border-or" role="search">
      <label htmlFor="q" className="sr-only">{t.rechercher}</label>
      <input id="q" name="q" defaultValue={valeur} placeholder={t.recherchePlaceholder} className="h-14 min-w-0 flex-1 bg-fond px-4 text-lg outline-none" autoFocus />
      <button className="inline-flex items-center gap-2 bg-noir px-6 font-titre uppercase tracking-[0.12em] text-white hover:bg-or hover:text-noir">
        <Search className="size-5" aria-hidden /> <span className="hidden sm:inline">{t.chercher}</span>
      </button>
    </Form>
  );
}

async function ChampAvecValeur({ searchParams, lang }: { searchParams: Recherche; lang: Langue }) {
  const { q } = await searchParams;
  return <ChampRecherche valeur={typeof q === "string" ? q : ""} lang={lang} />;
}

async function Resultats({ searchParams, lang }: { searchParams: Recherche; lang: Langue }) {
  const t = dico(lang);
  const { q } = await searchParams;
  const terme = typeof q === "string" ? q.trim() : "";
  if (terme.length < 2) {
    const dernieres = await getDernieres(lang, 8);
    return (
      <>
        <h2 className="titre-bloc mb-6 text-2xl">{t.derniersArticles}</h2>
        <ListeArticles articles={dernieres} lang={lang} miseEnAvant={false} />
      </>
    );
  }
  const resultats = await rechercher(terme, lang);
  return (
    <>
      <p className="mb-6 text-sm text-texte-doux" role="status">
        {pluriel(resultats.length, t.resultat, t.resultats)} {t.pour} « <strong className="text-encre">{terme}</strong> »
      </p>
      <ListeArticles articles={resultats} lang={lang} miseEnAvant={false} />
    </>
  );
}
