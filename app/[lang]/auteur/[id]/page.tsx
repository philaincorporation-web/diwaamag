import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAuteur, getIndexPublic } from "@/lib/data";
import { dico, pluriel } from "@/lib/i18n";
import { alternates, langueParams, auMoinsUn } from "@/lib/seo";
import { BarreLaterale } from "@/components/site/barre-laterale";
import { EnTetePage, ListeArticles, SqueletteListe } from "@/components/site/liste";

export async function generateStaticParams() {
  const { auteurs } = await getIndexPublic();
  return auMoinsUn("id", auteurs.map((a) => a.id));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/auteur/[id]">): Promise<Metadata> {
  const p = await params;
  const lang = langueParams(p.lang);
  const d = await getAuteur(p.id, lang);
  if (!d) return { title: "404" };
  return { title: d.auteur.nom, description: d.auteur.bio ?? undefined, alternates: alternates(lang, `/auteur/${p.id}`) };
}

export default function PageAuteur({ params }: PageProps<"/[lang]/auteur/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12"><SqueletteListe /></div>}>
      <Contenu params={params} />
    </Suspense>
  );
}

async function Contenu({ params }: { params: PageProps<"/[lang]/auteur/[id]">["params"] }) {
  const p = await params;
  const lang = langueParams(p.lang);
  const t = dico(lang);
  const d = await getAuteur(p.id, lang);
  if (!d) notFound();
  return (
    <>
      <EnTetePage surtitre={t.auteur} titre={d.auteur.nom} description={d.auteur.bio} />
      <div className="mx-auto mt-12 grid max-w-7xl gap-12 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <p className="mb-6 text-sm text-texte-doux">
            {pluriel(d.articles.length, t.article, t.articles)} {d.articles.length > 1 ? t.publies : t.publie}
          </p>
          <ListeArticles articles={d.articles} lang={lang} miseEnAvant={false} />
        </section>
        <BarreLaterale lang={lang} />
      </div>
    </>
  );
}
