import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarClock, ChevronRight, Clock, Languages, MessageSquare, RefreshCw } from "lucide-react";
import { getArticle, getArticlesLies, getCommentaires, getIndexPublic } from "@/lib/data";
import { siteUrl } from "@/lib/format";
import { dico, formatDate, lien, type Langue } from "@/lib/i18n";
import { alternates, langueParams, auMoinsUn } from "@/lib/seo";
import { CarteVerticale, EtiquetteRubrique, TitreBloc } from "@/components/site/cartes";
import { LecteurVideo, TexteRiche } from "@/components/site/texte-riche";
import { Pub } from "@/components/site/pub";
import { LectureAudio } from "@/components/site/lecture-audio";
import { texteBrut } from "@/lib/content";
import { BoutonRepondre, BoutonSignaler, BoutonsPartage, CompteurVues, FormulaireCommentaire, ProgressionLecture } from "@/components/site/interactifs";
import { BlocNewsletter, BlocPlusLus } from "@/components/site/barre-laterale";
import { Apparition } from "@/components/site/animations";
import { imageOptimisable } from "@/lib/images";

export async function generateStaticParams() {
  const { articles } = await getIndexPublic();
  return auMoinsUn("slug", articles.map((a) => a.slug));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/article/[slug]">): Promise<Metadata> {
  const p = await params;
  const lang = langueParams(p.lang);
  const a = await getArticle(p.slug, lang);
  if (!a) return { title: dico(lang).articleIntrouvable };
  const titre = a.metaTitre || a.titre;
  const description = a.metaDescription || a.chapeau;
  return {
    title: titre,
    description,
    alternates: alternates(lang, `/article/${a.slug}`),
    authors: [{ name: a.auteur.nom, url: lien(lang, `/auteur/${a.auteur.id}`) }],
    keywords: a.motsCles.map((m) => m.motCle.nom),
    openGraph: {
      type: "article",
      title: titre,
      description,
      url: lien(lang, `/article/${a.slug}`),
      publishedTime: a.datePublication?.toISOString(),
      modifiedTime: (a.dateMiseAJour ?? a.datePublication)?.toISOString(),
      section: a.rubrique.nom,
      tags: a.motsCles.map((m) => m.motCle.nom),
      images: a.imageUneUrl ? [{ url: a.imageUneUrl, alt: a.imageUneAlt ?? a.titre }] : undefined,
    },
    twitter: { card: "summary_large_image", title: titre, description, images: a.imageUneUrl ? [a.imageUneUrl] : undefined },
  };
}

export default function PageArticle({ params }: PageProps<"/[lang]/article/[slug]">) {
  return (
    <Suspense fallback={<Squelette />}>
      <Article params={params} />
    </Suspense>
  );
}

async function Article({ params }: { params: PageProps<"/[lang]/article/[slug]">["params"] }) {
  const p = await params;
  const lang = langueParams(p.lang);
  const t = dico(lang);
  const a = await getArticle(p.slug, lang);
  if (!a) notFound();

  const url = siteUrl(lien(lang, `/article/${a.slug}`));
  const urlFrancaise = siteUrl(lien("fr", `/article/${a.slug}`));
  const misAJour = a.dateMiseAJour && a.datePublication && a.dateMiseAJour.getTime() - a.datePublication.getTime() > 60_000;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.titre,
    description: a.chapeau,
    image: a.imageUneUrl ? [a.imageUneUrl.startsWith("/") ? siteUrl(a.imageUneUrl) : a.imageUneUrl] : undefined,
    datePublished: a.datePublication?.toISOString(),
    dateModified: (a.dateMiseAJour ?? a.datePublication)?.toISOString(),
    articleSection: a.rubrique.nom,
    keywords: a.motsCles.map((m) => m.motCle.nom).join(", "),
    wordCount: texteBrut(a.contenu).split(/\s+/).length,
    inLanguage: a.traduit ? lang : "fr",
    mainEntityOfPage: url,
    author: { "@type": "Person", name: a.auteur.nom, url: siteUrl(lien(lang, `/auteur/${a.auteur.id}`)) },
    publisher: { "@type": "NewsMediaOrganization", name: "DIWA MAG", url: siteUrl(), logo: { "@type": "ImageObject", url: siteUrl("/icons/icon-512.png") } },
  };

  return (
    <>
      <ProgressionLecture />
      <CompteurVues slug={a.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <article className="mx-auto max-w-7xl px-4 pt-8" lang={a.traduit ? lang : "fr"}>
        <nav aria-label={t.filAriane} className="flex items-center gap-1 text-xs text-texte-doux">
          <Link href={lien(lang, "/")} className="hover:text-or-fonce">{t.accueil}</Link>
          <ChevronRight className="size-3" aria-hidden />
          <Link href={lien(lang, `/rubrique/${a.rubrique.slug}`)} className="hover:text-or-fonce">{a.rubrique.nom}</Link>
        </nav>

        {lang !== "fr" && (!a.traduit || a.traductionAuto) && (
          <p lang={lang} className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-1 border-l-4 border-or bg-fond-2 px-4 py-3 text-sm">
            <Languages className="size-4 shrink-0 text-or-fonce" aria-hidden />
            <span>{a.traduit ? t.traductionAuto : t.traductionIndisponible}</span>
            {!a.traduit && (
              <a
                href={`https://translate.google.com/translate?sl=fr&tl=${lang}&u=${encodeURIComponent(urlFrancaise)}`}
                target="_blank"
                rel="noopener"
                className="font-semibold text-or-fonce underline"
              >
                {t.traduireAvecGoogle}
              </a>
            )}
          </p>
        )}

        <header className="mx-auto mt-6 max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3">
            <EtiquetteRubrique rubrique={a.rubrique} lang={lang} />
            <span className="font-titre text-xs uppercase tracking-[0.2em] text-texte-doux">{t.types[a.type]}</span>
            {a.partenaire && <span className="border border-or px-2 py-1 font-titre text-[11px] uppercase leading-none tracking-[0.12em] text-or-fonce">{t.contenuPartenaire}</span>}
          </div>
          <h1 className="mt-5 font-titre text-4xl font-bold uppercase leading-[1.04] text-encre sm:text-5xl lg:text-6xl">{a.titre}</h1>
          <p className="mx-auto mt-6 max-w-3xl font-serif text-xl leading-relaxed text-texte-doux sm:text-[1.375rem]">{a.chapeau}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-texte-doux">
            <span>
              {t.Par}{" "}
              <Link href={lien(lang, `/auteur/${a.auteur.id}`)} className="font-semibold text-encre hover:text-or-fonce">{a.auteur.nom}</Link>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4 text-or-fonce" aria-hidden />
              {t.publieLe} <time dateTime={a.datePublication?.toISOString()}>{formatDate(lang, a.datePublication, "heure")}</time>
            </span>
            {misAJour && (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="size-4 text-or-fonce" aria-hidden />
                {t.misAJourLe} <time dateTime={a.dateMiseAJour!.toISOString()}>{formatDate(lang, a.dateMiseAJour, "heure")}</time>
              </span>
            )}
            {a.tempsLecture && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-or-fonce" aria-hidden /> {a.tempsLecture} {t.minLecture}
              </span>
            )}
          </div>
        </header>

        <div className="mx-auto mt-10 max-w-5xl">
          {a.type === "VIDEO" && a.videoUrl ? (
            <LecteurVideo url={a.videoUrl} titre={a.titre} />
          ) : (
            a.imageUneUrl && (
              <figure>
                <div className="relative aspect-[16/9] overflow-hidden bg-fond-2">
                  <Image src={a.imageUneUrl} unoptimized={!imageOptimisable(a.imageUneUrl)} alt={a.imageUneAlt || a.titre} fill preload sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover object-top" />
                </div>
                {a.imageUneAlt && <figcaption className="mt-2 text-xs text-texte-doux">{a.imageUneAlt}</figcaption>}
              </figure>
            )
          )}
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-y border-ligne py-4">
              <BoutonsPartage titre={a.titre} url={url} />
              <LectureAudio texte={`${a.titre}. ${a.chapeau}. ${texteBrut(a.contenu)}`} />
            </div>
            {a.partenaire && (
              <p className="mb-8 border-l-4 border-or bg-fond-2 px-4 py-3 text-sm">
                <strong className="font-titre uppercase tracking-[0.12em] text-or-fonce">{t.contenuPartenaire}</strong> · {t.enCollaborationAvec} <strong>{a.partenaire}</strong>.
              </p>
            )}
            {!a.partenaire && <Pub emplacement="ARTICLE_HAUT" className="mb-8" />}
            <TexteRiche doc={a.contenu} />
            {!a.partenaire && <Pub emplacement="ARTICLE_BAS" className="mt-10" />}

            {a.motsCles.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-ligne pt-6">
                <span className="mr-1 font-titre text-xs uppercase tracking-[0.16em] text-texte-doux">{t.motsCles}</span>
                {a.motsCles.map(({ motCle }) => (
                  <Link key={motCle.id} href={lien(lang, `/mot-cle/${motCle.slug}`)} className="border border-ligne px-3 py-1 text-xs font-medium hover:border-or hover:bg-or hover:text-noir">
                    #{motCle.nom}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-8 border-y border-ligne py-4">
              <BoutonsPartage titre={a.titre} url={url} />
            </div>

            <div className="mt-10 flex gap-5 bg-fond-2 p-6">
              <div className="grid size-16 shrink-0 place-items-center rounded-full bg-noir font-titre text-2xl text-or">{a.auteur.nom.slice(0, 1)}</div>
              <div>
                <p className="font-titre text-xs uppercase tracking-[0.2em] text-or-fonce">{t.aProposAuteur}</p>
                <Link href={lien(lang, `/auteur/${a.auteur.id}`)} className="mt-1 block text-lg font-bold hover:text-or-fonce">{a.auteur.nom}</Link>
                {a.auteur.bio && <p className="mt-2 text-sm leading-relaxed text-texte-doux">{a.auteur.bio}</p>}
              </div>
            </div>

            <Commentaires articleId={a.id} lang={lang} />
          </div>
          <div className="space-y-12 lg:sticky lg:top-24 lg:self-start">
            <BlocPlusLus lang={lang} />
            <BlocNewsletter lang={lang} />
          </div>
        </div>
      </article>

      <ArticlesLies articleId={a.id} rubriqueId={a.rubriqueId} motCleIds={a.motsCles.map((m) => m.motCleId)} lang={lang} />
    </>
  );
}

async function ArticlesLies({ articleId, rubriqueId, motCleIds, lang }: { articleId: string; rubriqueId: string; motCleIds: string[]; lang: Langue }) {
  const lies = await getArticlesLies(articleId, rubriqueId, motCleIds, lang, 4);
  if (lies.length === 0) return null;
  return (
    <section className="mt-16 bg-fond-2 py-14" aria-labelledby="lies">
      <div className="mx-auto max-w-7xl px-4">
        <TitreBloc lang={lang}>
          <span id="lies">{dico(lang).aLireAussi}</span>
        </TitreBloc>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {lies.map((l, i) => (
            <Apparition key={l.id} delai={i * 0.06}>
              <CarteVerticale article={l} lang={lang} chapeau={false} sizes="(min-width: 1024px) 25vw, 50vw" />
            </Apparition>
          ))}
        </div>
      </div>
    </section>
  );
}

async function Commentaires({ articleId, lang }: { articleId: string; lang: Langue }) {
  const t = dico(lang);
  const commentaires = await getCommentaires(articleId);
  const total = commentaires.reduce((n, c) => n + 1 + c.reponses.length, 0);
  return (
    <section id="commentaires" className="mt-14 scroll-mt-24" aria-labelledby="titre-commentaires">
      <TitreBloc lang={lang}>
        <span id="titre-commentaires" className="inline-flex items-center gap-2">
          <MessageSquare className="size-5 text-or" aria-hidden /> {total} {total > 1 ? t.commentaires : t.commentaire}
        </span>
      </TitreBloc>
      {commentaires.length > 0 && (
        <ol className="space-y-6">
          {commentaires.map((c) => (
            <li key={c.id} className="border-b border-ligne pb-6">
              <Commentaire c={c} lang={lang} />
              <div className="mt-3 flex items-center gap-4 pl-14">
                <BoutonRepondre articleId={articleId} parentId={c.id} nom={c.nom} />
                <BoutonSignaler commentaireId={c.id} />
              </div>
              {c.reponses.length > 0 && (
                <ol className="mt-5 space-y-5 border-l-2 border-or/40 pl-6 sm:ml-14">
                  {c.reponses.map((r) => (
                    <li key={r.id}>
                      <Commentaire c={r} lang={lang} />
                      <div className="mt-2 pl-14">
                        <BoutonSignaler commentaireId={r.id} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-10 border-t-4 border-or pt-6">
        <h3 className="font-titre text-2xl uppercase">{t.laisserCommentaire}</h3>
        <p className="mb-6 mt-1 text-sm text-texte-doux">{t.emailJamaisPublie}</p>
        <FormulaireCommentaire articleId={articleId} />
      </div>
    </section>
  );
}

function Commentaire({ c, lang }: { c: { nom: string; message: string; lien: string | null; creeLe: Date }; lang: Langue }) {
  return (
    <div className="flex gap-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-or font-titre text-lg text-noir" aria-hidden>{c.nom.slice(0, 1).toUpperCase()}</div>
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-bold">{c.nom}</span>{" "}
          <time className="text-xs text-texte-doux" dateTime={c.creeLe.toISOString()}>· {formatDate(lang, c.creeLe)}</time>
        </p>
        <p className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed">{c.message}</p>
        {c.lien && (
          <a href={c.lien} target="_blank" rel="noopener nofollow ugc" className="mt-2 inline-block break-all text-sm text-or-fonce underline">{c.lien}</a>
        )}
      </div>
    </div>
  );
}

function Squelette() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 pt-14 motion-reduce:animate-none" aria-hidden>
      <div className="mx-auto h-5 w-32 bg-or/40" />
      <div className="mx-auto mt-6 h-12 w-full bg-fond-2" />
      <div className="mx-auto mt-3 h-12 w-3/4 bg-fond-2" />
      <div className="mx-auto mt-8 h-5 w-2/3 bg-fond-2" />
      <div className="mt-10 aspect-[16/9] w-full bg-fond-2" />
    </div>
  );
}
