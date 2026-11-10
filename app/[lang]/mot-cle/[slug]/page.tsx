import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getIndexPublic, getMotCle } from "@/lib/data";
import { dico, pluriel } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { BarreLaterale } from "@/components/site/barre-laterale";
import { EnTetePage, ListeArticles, SqueletteListe } from "@/components/site/liste";

export async function generateStaticParams() {
  const { motsCles } = await getIndexPublic();
  return motsCles.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/mot-cle/[slug]">): Promise<Metadata> {
  const p = await params;
  const lang = langueParams(p.lang);
  const d = await getMotCle(p.slug, lang);
  if (!d) return { title: "404" };
  return { title: `#${d.motCle.nom}`, alternates: alternates(lang, `/mot-cle/${p.slug}`) };
}

export default function PageMotCle({ params }: PageProps<"/[lang]/mot-cle/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12"><SqueletteListe /></div>}>
      <Contenu params={params} />
    </Suspense>
  );
}

async function Contenu({ params }: { params: PageProps<"/[lang]/mot-cle/[slug]">["params"] }) {
  const p = await params;
  const lang = langueParams(p.lang);
  const t = dico(lang);
  const d = await getMotCle(p.slug, lang);
  if (!d) notFound();
  return (
    <>
      <EnTetePage surtitre={t.motCle} titre={`#${d.motCle.nom}`} description={pluriel(d.articles.length, t.article, t.articles)} />
      <div className="mx-auto mt-12 grid max-w-7xl gap-12 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <ListeArticles articles={d.articles} lang={lang} miseEnAvant={false} />
        </section>
        <BarreLaterale lang={lang} />
      </div>
    </>
  );
}
