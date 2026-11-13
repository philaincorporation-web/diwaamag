import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { formatDate, lien } from "@/lib/i18n";
import { auMoinsUn, langueParams } from "@/lib/seo";
import { imageOptimisable } from "@/lib/images";
import { getActualiteVeille, getCategoriesVeille, getDerniersIdsVeille } from "@/lib/veille/donnees";
import { ZONES, type ZoneVeilleCle } from "@/lib/veille/defauts";
import { textesVeille } from "@/lib/veille/textes";

export async function generateStaticParams() {
  return auMoinsUn("id", await getDerniersIdsVeille());
}

export async function generateMetadata({ params }: PageProps<"/[lang]/veille/[id]">): Promise<Metadata> {
  const { lang: l, id } = await params;
  const lang = langueParams(l);
  const a = await getActualiteVeille(id);
  if (!a) return { title: textesVeille(lang).menu };
  // Contenu repris d'autres médias : non indexé, pour ne pas concurrencer l'article original.
  return { title: a.titre, description: a.extrait.slice(0, 160), robots: { index: false, follow: true } };
}

export default async function PageActualiteVeille({ params }: PageProps<"/[lang]/veille/[id]">) {
  const { lang: l, id } = await params;
  const lang = langueParams(l);
  const t = textesVeille(lang);
  const [a, categories] = await Promise.all([getActualiteVeille(id), getCategoriesVeille()]);
  if (!a) notFound();
  const noms = new Map(categories.map((c) => [c.slug, lang === "en" ? c.nomEn : c.nom]));
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href={lien(lang, "/veille")} className="inline-flex items-center gap-1 text-sm font-semibold text-or-fonce hover:text-encre">
        <ArrowLeft className="size-4" aria-hidden /> {t.retour}
      </Link>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {a.categories.map((c) =>
          noms.get(c) ? (
            <Link key={c} href={lien(lang, `/veille?categorie=${c}`)} className="bg-or px-2 py-1 font-titre text-[11px] uppercase tracking-[0.12em] text-noir hover:bg-noir hover:text-or">
              {noms.get(c)}
            </Link>
          ) : null,
        )}
        {a.zone !== "NON_PRECISE" && (
          <Link href={lien(lang, `/veille?zone=${a.zone}`)} className="border border-ligne px-2 py-1 font-titre text-[11px] uppercase tracking-[0.12em] text-texte-doux hover:border-or">
            {ZONES[a.zone as ZoneVeilleCle][lang]}
          </Link>
        )}
        {a.langue === "en" && lang === "fr" && <span className="text-xs font-semibold uppercase text-texte-doux">{t.enAnglais}</span>}
      </div>
      <h1 className="mt-4 font-titre text-[1.75rem] font-bold uppercase leading-[1.08] text-encre sm:text-4xl">{a.titre}</h1>
      <p className="mt-3 text-sm text-texte-doux">
        {t.source} : <span className="font-semibold text-texte">{a.source.nom}</span> · {t.publieLe}{" "}
        <time dateTime={a.datePublication.toISOString()}>{formatDate(lang, a.datePublication, "heure")}</time>
      </p>
      {a.imageUrl && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden bg-fond-2">
          <Image src={a.imageUrl} unoptimized={!imageOptimisable(a.imageUrl)} alt="" fill sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />
        </div>
      )}
      {a.extrait && <p className="mt-6 font-serif text-[1.0625rem] leading-relaxed sm:text-lg">{a.extrait}</p>}
      <a href={a.url} target="_blank" rel="noopener nofollow" className="mt-6 inline-flex h-11 items-center gap-2 bg-noir px-5 text-sm font-semibold text-white hover:bg-or hover:text-noir">
        {t.lireSur(a.source.nom)} <ExternalLink className="size-4" aria-hidden />
      </a>
      <p className="mt-4 text-xs text-texte-doux">{t.avertissement(a.source.nom)}</p>

      {a.proches.length > 0 && (
        <section className="mt-12 border-t border-ligne pt-6">
          <h2 className="font-titre text-lg uppercase tracking-wide">{t.proches}</h2>
          <ul className="mt-3 divide-y divide-ligne">
            {a.proches.map((p) => (
              <li key={p.id} className="py-3">
                <Link href={lien(lang, `/veille/${p.id}`)} className="font-semibold hover:text-or-fonce">
                  {p.titre}
                </Link>
                <span className="block text-xs text-texte-doux">
                  {p.source.nom} · {formatDate(lang, p.datePublication)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
