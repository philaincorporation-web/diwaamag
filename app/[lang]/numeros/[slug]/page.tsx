import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FileDown } from "lucide-react";
import { getNumero, getNumeros } from "@/lib/data";
import { dico, formatDate } from "@/lib/i18n";
import { alternates, langueParams, auMoinsUn } from "@/lib/seo";
import { CarteHorizontale } from "@/components/site/cartes";
import { SqueletteListe } from "@/components/site/liste";
import { Apparition } from "@/components/site/animations";
import { imageOptimisable } from "@/lib/images";

export async function generateStaticParams() {
  const numeros = await getNumeros("fr");
  return auMoinsUn("slug", numeros.map((n) => n.slug));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/numeros/[slug]">): Promise<Metadata> {
  const p = await params;
  const lang = langueParams(p.lang);
  const n = await getNumero(p.slug, lang);
  if (!n) return { title: "404" };
  return { title: n.titre, description: n.edito ?? undefined, openGraph: { images: [{ url: n.couvertureUrl }] }, alternates: alternates(lang, `/numeros/${p.slug}`) };
}

export default function PageNumero({ params }: PageProps<"/[lang]/numeros/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12"><SqueletteListe /></div>}>
      <Contenu params={params} />
    </Suspense>
  );
}

async function Contenu({ params }: { params: PageProps<"/[lang]/numeros/[slug]">["params"] }) {
  const p = await params;
  const lang = langueParams(p.lang);
  const t = dico(lang);
  const n = await getNumero(p.slug, lang);
  if (!n) notFound();
  return (
    <>
      <header className="bg-noir text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-[300px_1fr]">
          <div className="relative mx-auto aspect-[3/4] w-56 shadow-[0_30px_60px_-20px_rgba(205,164,14,0.45)] md:w-full">
            <Image src={n.couvertureUrl} unoptimized={!imageOptimisable(n.couvertureUrl)} alt={`${t.couverture} — ${n.titre}`} fill preload sizes="300px" className="object-cover" />
          </div>
          <div>
            <p className="font-titre text-sm uppercase tracking-[0.3em] text-or">{formatDate(lang, n.mois, "mois")}</p>
            <h1 className="mt-2 font-titre text-4xl font-bold uppercase leading-tight sm:text-5xl">{n.titre}</h1>
            {n.edito && <p className="mt-5 max-w-2xl font-serif text-lg leading-relaxed text-white/80">{n.edito}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              {n.pdfUrl ? (
                <a href={n.pdfUrl} target="_blank" rel="noopener" className="inline-flex h-12 items-center gap-2 bg-or px-6 font-titre font-semibold uppercase tracking-[0.12em] text-noir hover:bg-white">
                  <FileDown className="size-5" aria-hidden /> {t.telechargerPdf}
                </a>
              ) : (
                <span className="inline-flex h-12 items-center border border-white/20 px-6 text-sm text-white/60">{t.pdfBientot}</span>
              )}
            </div>
          </div>
        </div>
        <div className="h-1 bg-or" />
      </header>
      <section className="mx-auto max-w-5xl px-4 py-12" aria-labelledby="sommaire">
        <h2 id="sommaire" className="titre-bloc mb-8 text-3xl">{t.sommaire}</h2>
        <ol className="divide-y divide-ligne">
          {n.articles.map((article, i) => (
            <Apparition as="li" key={article.id} delai={Math.min(i, 4) * 0.04} className="py-6 first:pt-0">
              <CarteHorizontale article={article} lang={lang} />
            </Apparition>
          ))}
        </ol>
      </section>
    </>
  );
}
