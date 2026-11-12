import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CarteArticle } from "@/lib/data";
import { dico, lien, type Langue } from "@/lib/i18n";
import { CarteHorizontale, CarteSuperposee } from "@/components/site/cartes";
import { Apparition } from "@/components/site/animations";
import { cn } from "@/lib/cn";

export function EnTetePage({ surtitre, titre, description }: { surtitre?: string; titre: string; description?: string | null }) {
  return (
    <header className="relative overflow-hidden bg-noir text-white">
      <div className="absolute -right-24 -top-24 size-72 rounded-full border-[40px] border-or/15" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-16">
        {surtitre && <p className="font-titre text-sm uppercase tracking-[0.3em] text-or">{surtitre}</p>}
        <h1 className="mt-2 font-titre text-[1.9rem] font-bold uppercase leading-none sm:text-6xl">{titre}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm text-white/75 sm:mt-4 sm:text-base">{description}</p>}
      </div>
      <div className="h-1 bg-or" />
    </header>
  );
}

/** Liste d'articles : le premier en grand, les suivants en cartes horizontales. */
export function ListeArticles({ articles, lang, miseEnAvant = true }: { articles: CarteArticle[]; lang: Langue; miseEnAvant?: boolean }) {
  if (articles.length === 0) return <p className="py-10 text-center text-texte-doux">{dico(lang).aucunArticle}</p>;
  const [premier, ...autres] = miseEnAvant ? articles : [null, ...articles];
  return (
    <div>
      {premier && (
        <div className="mb-8 h-[320px] sm:mb-10 sm:h-[480px]">
          <CarteSuperposee article={premier} lang={lang} prioritaire sizes="(min-width: 1024px) 800px, 100vw" />
        </div>
      )}
      <ul className="divide-y divide-ligne">
        {autres.map((a, i) =>
          a ? (
            <Apparition as="li" key={a.id} delai={Math.min(i, 4) * 0.05} className="py-6 first:pt-0">
              <CarteHorizontale article={a} lang={lang} />
            </Apparition>
          ) : null,
        )}
      </ul>
    </div>
  );
}

export function Pagination({ page, pages, base, lang }: { page: number; pages: number; base: string; lang: Langue }) {
  if (pages <= 1) return null;
  const t = dico(lang);
  const url = (p: number) => lien(lang, p === 1 ? base : `${base}?page=${p}`);
  return (
    <nav aria-label={t.pagination} className="mt-10 flex items-center justify-center gap-2">
      {page > 1 && (
        <Link href={url(page - 1)} className="grid size-10 place-items-center border border-ligne hover:border-or" aria-label={t.pagePrecedente}>
          <ChevronLeft className="size-4" />
        </Link>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={url(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn("grid size-10 place-items-center border font-titre", p === page ? "border-or bg-or text-noir" : "border-ligne hover:border-or")}
        >
          {p}
        </Link>
      ))}
      {page < pages && (
        <Link href={url(page + 1)} className="grid size-10 place-items-center border border-ligne hover:border-or" aria-label={t.pageSuivante}>
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}

export function SqueletteListe() {
  return (
    <div className="animate-pulse space-y-6 motion-reduce:animate-none" aria-hidden>
      <div className="h-[420px] bg-fond-2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid grid-cols-[260px_1fr] gap-6">
          <div className="aspect-[4/3] bg-fond-2" />
          <div className="space-y-3">
            <div className="h-4 w-24 bg-or/30" />
            <div className="h-6 w-full bg-fond-2" />
            <div className="h-6 w-2/3 bg-fond-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
