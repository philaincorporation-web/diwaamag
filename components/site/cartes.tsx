// Cartes d'articles réutilisables (inspirées des grilles de presse : superposition, verticale, horizontale, liste).
import Image from "next/image";
import Link from "next/link";
import { Clock, PlayCircle } from "lucide-react";
import type { CarteArticle } from "@/lib/data";
import { dico, formatDate, lien, type Langue } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Rubrique = CarteArticle["rubrique"];

export function EtiquetteRubrique({ rubrique, lang, className, cliquable = true }: { rubrique: Rubrique; lang: Langue; className?: string; cliquable?: boolean }) {
  const classes = cn(
    "inline-block bg-or px-2 py-1 font-titre text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-noir",
    className,
  );
  if (!cliquable) return <span className={classes}>{rubrique.nom}</span>;
  return (
    <Link href={lien(lang, `/rubrique/${rubrique.slug}`)} className={cn(classes, "transition-colors hover:bg-noir hover:text-or")}>
      {rubrique.nom}
    </Link>
  );
}

export function MetaArticle({
  article,
  lang,
  clair = false,
  className,
  auteur = true,
}: {
  article: CarteArticle;
  lang: Langue;
  clair?: boolean;
  className?: string;
  auteur?: boolean;
}) {
  const t = dico(lang);
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium", clair ? "text-white/80" : "text-texte-doux", className)}>
      {auteur && (
        <>
          <span>
            {t.par} <span className={clair ? "font-semibold text-white" : "font-semibold text-texte"}>{article.auteur.nom}</span>
          </span>
          <span aria-hidden>·</span>
        </>
      )}
      <time dateTime={article.datePublication?.toISOString()}>{formatDate(lang, article.datePublication)}</time>
      {article.tempsLecture ? (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden /> {article.tempsLecture} {t.min}
          </span>
        </>
      ) : null}
    </p>
  );
}

function Visuel({ article, sizes, className, prioritaire, lang }: { article: CarteArticle; sizes: string; className?: string; prioritaire?: boolean; lang: Langue }) {
  return (
    <div className={cn(className?.includes("absolute") ? "" : "relative", "overflow-hidden bg-fond-2", className)}>
      {article.imageUneUrl ? (
        <Image
          src={article.imageUneUrl}
          alt={article.imageUneAlt || article.titre}
          fill
          sizes={sizes}
          preload={prioritaire}
          className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-noir font-titre text-3xl text-or">DIWA</div>
      )}
      {article.type === "VIDEO" && (
        <span className="absolute left-3 top-3 grid size-10 place-items-center rounded-full bg-or text-noir shadow-lg">
          <PlayCircle className="size-6" aria-label={dico(lang).video} />
        </span>
      )}
    </div>
  );
}

/** Grande carte avec titre en surimpression (Une, mises en avant). */
export function CarteSuperposee({
  article,
  lang,
  taille = "grande",
  prioritaire,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: {
  article: CarteArticle;
  lang: Langue;
  taille?: "grande" | "moyenne" | "petite";
  prioritaire?: boolean;
  sizes?: string;
}) {
  return (
    <article className="group relative h-full overflow-hidden bg-noir">
      <Visuel article={article} sizes={sizes} prioritaire={prioritaire} lang={lang} className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className={cn("absolute inset-x-0 bottom-0", taille === "grande" ? "p-5 sm:p-8" : "p-4 sm:p-5")}>
        <EtiquetteRubrique rubrique={article.rubrique} lang={lang} />
        <h3
          className={cn(
            "mt-3 font-titre font-semibold uppercase leading-[1.08] text-white",
            taille === "grande" && "text-3xl sm:text-4xl lg:text-[2.75rem]",
            taille === "moyenne" && "text-2xl",
            taille === "petite" && "text-lg",
          )}
        >
          <Link href={lien(lang, `/article/${article.slug}`)} className="after:absolute after:inset-0 hover:text-or">
            {article.titre}
          </Link>
        </h3>
        {taille === "grande" && <p className="mt-3 line-clamp-2 max-w-2xl text-sm text-white/85 sm:text-base">{article.chapeau}</p>}
        <MetaArticle article={article} lang={lang} clair className="mt-3" auteur={taille !== "petite"} />
      </div>
    </article>
  );
}

/** Carte image en haut, texte dessous. */
export function CarteVerticale({
  article,
  lang,
  chapeau = true,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  sombre = false,
}: {
  article: CarteArticle;
  lang: Langue;
  chapeau?: boolean;
  sizes?: string;
  sombre?: boolean;
}) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <Visuel article={article} sizes={sizes} lang={lang} className="aspect-[16/10]" />
        <EtiquetteRubrique rubrique={article.rubrique} lang={lang} className="absolute bottom-0 left-0 z-10" />
      </div>
      <h3 className={cn("mt-4 font-titre text-[1.375rem] font-semibold uppercase leading-[1.15]", sombre ? "text-white" : "text-encre")}>
        <Link
          href={lien(lang, `/article/${article.slug}`)}
          className="bg-[linear-gradient(var(--or),var(--or))] bg-[length:0%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 hover:bg-[length:100%_2px]"
        >
          {article.titre}
        </Link>
      </h3>
      {chapeau && <p className={cn("mt-2 line-clamp-3 text-sm leading-relaxed", sombre ? "text-white/70" : "text-texte-doux")}>{article.chapeau}</p>}
      <MetaArticle article={article} lang={lang} clair={sombre} className="mt-3" />
    </article>
  );
}

/** Carte image à gauche (fil d'actualités, listes de rubrique). */
export function CarteHorizontale({ article, lang, sizes = "(min-width: 640px) 280px, 40vw" }: { article: CarteArticle; lang: Langue; sizes?: string }) {
  const href = lien(lang, `/article/${article.slug}`);
  return (
    <article className="group grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 sm:grid-cols-[260px_minmax(0,1fr)] sm:gap-6">
      <Link href={href} tabIndex={-1} aria-hidden>
        <Visuel article={article} sizes={sizes} lang={lang} className="aspect-[4/3]" />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <EtiquetteRubrique rubrique={article.rubrique} lang={lang} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-texte-doux">{dico(lang).types[article.type]}</span>
        </div>
        <h3 className="mt-2 font-titre text-xl font-semibold uppercase leading-[1.15] text-encre sm:text-2xl">
          <Link href={href} className="hover:text-or-fonce">{article.titre}</Link>
        </h3>
        <p className="mt-2 hidden line-clamp-2 text-sm leading-relaxed text-texte-doux sm:block">{article.chapeau}</p>
        <MetaArticle article={article} lang={lang} className="mt-2" />
      </div>
    </article>
  );
}

/** Ligne compacte avec vignette (barre latérale). */
export function CarteMini({ article, lang }: { article: CarteArticle; lang: Langue }) {
  return (
    <article className="group grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3">
      <Visuel article={article} sizes="88px" lang={lang} className="aspect-square" />
      <div className="min-w-0">
        <p className="font-titre text-[11px] uppercase tracking-[0.14em] text-or-fonce">{article.rubrique.nom}</p>
        <h3 className="mt-1 line-clamp-3 text-[15px] font-semibold leading-snug text-encre">
          <Link href={lien(lang, `/article/${article.slug}`)} className="hover:text-or-fonce">{article.titre}</Link>
        </h3>
        <p className="mt-1 text-[11px] text-texte-doux">{formatDate(lang, article.datePublication)}</p>
      </div>
    </article>
  );
}

/** Ligne de classement façon presse écrite : grand chiffre détouré, titre, petite vignette à droite. */
export function CarteClassement({ article, lang, rang }: { article: CarteArticle; lang: Langue; rang: number }) {
  return (
    <article className="group grid grid-cols-[2.75rem_minmax(0,1fr)_64px] items-start gap-3 py-4">
      <span
        aria-hidden
        className="font-titre text-[2.6rem] font-bold leading-[0.85] text-transparent transition-colors duration-300 [-webkit-text-stroke:1.5px_var(--or-fonce)] group-hover:text-or"
      >
        {String(rang).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <p className="font-titre text-[11px] uppercase tracking-[0.14em] text-or-fonce">{article.rubrique.nom}</p>
        <h3 className="mt-1 line-clamp-3 text-[15px] font-semibold leading-snug text-encre">
          <Link href={lien(lang, `/article/${article.slug}`)} className="hover:text-or-fonce">
            <span className="sr-only">{rang}. </span>
            {article.titre}
          </Link>
        </h3>
        <p className="mt-1 text-[11px] text-texte-doux">{formatDate(lang, article.datePublication)}</p>
      </div>
      <Visuel article={article} sizes="64px" lang={lang} className="aspect-square" />
    </article>
  );
}

export function TitreBloc({
  children,
  href,
  lang = "fr",
  sombre = false,
  as: Tag = "h2",
  className,
}: {
  children: React.ReactNode;
  href?: string;
  lang?: Langue;
  sombre?: boolean;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-end gap-4", className)}>
      <Tag className={cn("titre-bloc flex-1 text-2xl font-semibold sm:text-[1.75rem]", sombre ? "text-white" : "text-encre")}>
        <span className="relative pl-4 before:absolute before:inset-y-0.5 before:left-0 before:w-1.5 before:bg-or">{children}</span>
      </Tag>
      {href && (
        <Link
          href={lien(lang, href)}
          className={cn("shrink-0 pb-1 text-xs font-semibold uppercase tracking-[0.14em] hover:text-or", sombre ? "text-white/70" : "text-texte-doux")}
        >
          {dico(lang).toutVoir} →
        </Link>
      )}
    </div>
  );
}
