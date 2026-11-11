import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArticlesRubrique, getRubrique, getRubriques } from "@/lib/data";
import { dico } from "@/lib/i18n";
import { alternates, langueParams, auMoinsUn } from "@/lib/seo";
import { BarreLaterale } from "@/components/site/barre-laterale";
import { EnTetePage, ListeArticles, Pagination, SqueletteListe } from "@/components/site/liste";

type Params = PageProps<"/[lang]/rubrique/[slug]">["params"];

export async function generateStaticParams() {
  const rubriques = await getRubriques("fr");
  return auMoinsUn("slug", rubriques.map((r) => r.slug));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/rubrique/[slug]">): Promise<Metadata> {
  const p = await params;
  const lang = langueParams(p.lang);
  const r = await getRubrique(p.slug, lang);
  if (!r) return { title: "404" };
  return { title: r.nom, description: r.description ?? undefined, alternates: alternates(lang, `/rubrique/${r.slug}`) };
}

export default function PageRubrique({ params, searchParams }: PageProps<"/[lang]/rubrique/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12"><SqueletteListe /></div>}>
      <Contenu params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenu({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [p, sp] = await Promise.all([params, searchParams]);
  const lang = langueParams(p.lang);
  const t = dico(lang);
  const r = await getRubrique(p.slug, lang);
  if (!r) notFound();
  const page = Math.max(1, Number(sp.page) || 1);
  const { articles, pages } = await getArticlesRubrique(p.slug, lang, page, 12);
  return (
    <>
      <EnTetePage surtitre={r.famille === "GEOGRAPHIQUE" ? t.region : t.thematique} titre={r.nom} description={r.description} />
      <div className="mx-auto mt-12 grid max-w-7xl gap-12 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <ListeArticles articles={articles} lang={lang} miseEnAvant={page === 1} />
          <Pagination page={page} pages={pages} base={`/rubrique/${p.slug}`} lang={lang} />
        </section>
        <BarreLaterale lang={lang} />
      </div>
    </>
  );
}
