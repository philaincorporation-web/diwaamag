// Carte d'une actualité de la Veille Média.
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatDate, lien, type Langue } from "@/lib/i18n";
import { imageOptimisable } from "@/lib/images";
import { ZONES, type ZoneVeilleCle } from "@/lib/veille/defauts";
import { textesVeille } from "@/lib/veille/textes";
import type { ActualiteVeilleCarte } from "@/lib/veille/donnees";

export function CarteVeille({ a, lang, nomsCategories }: { a: ActualiteVeilleCarte; lang: Langue; nomsCategories: Map<string, string> }) {
  const t = textesVeille(lang);
  const categorie = a.categories[0] ? nomsCategories.get(a.categories[0]) : null;
  return (
    <article className="group flex h-full flex-col border border-ligne bg-fond transition-colors hover:border-or">
      {a.imageUrl && (
        <Link href={lien(lang, `/veille/${a.id}`)} tabIndex={-1} aria-hidden className="relative block aspect-[16/9] overflow-hidden bg-fond-2">
          <Image src={a.imageUrl} unoptimized={!imageOptimisable(a.imageUrl)} alt="" fill sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {categorie && <span className="bg-or px-1.5 py-0.5 font-titre text-[10px] uppercase tracking-[0.12em] text-noir">{categorie}</span>}
          {a.zone !== "NON_PRECISE" && (
            <span className="border border-ligne px-1.5 py-0.5 font-titre text-[10px] uppercase tracking-[0.12em] text-texte-doux">{ZONES[a.zone as ZoneVeilleCle][lang]}</span>
          )}
          {a.langue !== lang && <span className="text-[10px] font-semibold uppercase text-texte-doux">{a.langue.toUpperCase()}</span>}
        </div>
        <h2 className="mt-2 text-[15px] font-bold leading-snug text-encre sm:text-base">
          <Link href={lien(lang, `/veille/${a.id}`)} className="hover:text-or-fonce">
            {a.titre}
          </Link>
        </h2>
        {a.extrait && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-texte-doux">{a.extrait}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-texte-doux">
          <span>
            <span className="font-semibold text-texte">{a.source.nom}</span> · <time dateTime={a.datePublication.toISOString()}>{formatDate(lang, a.datePublication)}</time>
          </span>
          <a href={a.url} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-1 font-semibold text-or-fonce hover:text-encre">
            {t.lireSur(a.source.nom)} <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}
