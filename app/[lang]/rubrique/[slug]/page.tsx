import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArticlesRubrique, getRubrique, getRubriques } from "@/lib/data";
import { dico } from "@/lib/i18n";
import { alternates, langueParams, auMoinsUn } from "@/lib/seo";
import { BarreLaterale } from "@/components/site/barre-laterale";
import Image from "next/image";
import { EnTetePage, ListeArticles, Pagination, SqueletteListe } from "@/components/site/liste";
import { imageOptimisable } from "@/lib/images";

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
      {r.sponsor && (
        <div className="border-b border-ligne bg-fond-2">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
            <span className="font-titre text-xs uppercase tracking-[0.18em] text-texte-doux">{t.rubriquePresenteePar}</span>
            <a
              href={r.sponsor.lien && /^https?:\/\//i.test(r.sponsor.lien) ? r.sponsor.lien : undefined}
              target="_blank"
              rel="sponsored noopener"
              className="inline-flex items-center gap-3 font-semibold hover:text-or-fonce"
            >
              {r.sponsor.logoUrl && (
                <Image src={r.sponsor.logoUrl} unoptimized={!imageOptimisable(r.sponsor.logoUrl)} alt="" width={160} height={48} className="h-8 w-auto max-w-32 object-contain" />
              )}
              {r.sponsor.nom}
            </a>
          </div>
        </div>
      )}
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
