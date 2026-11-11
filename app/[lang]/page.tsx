import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, PlayCircle } from "lucide-react";
import { getArticlesRubrique, getDernieres, getNumeros, getRubriques, getUne, getVideos, type CarteArticle } from "@/lib/data";
import { dico, formatDate, lien, type Langue } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { CarteHorizontale, CarteMini, CarteSuperposee, CarteVerticale, TitreBloc } from "@/components/site/cartes";
import { Apparition, BandeauDefilant, CarrouselUne, OngletsRubriques } from "@/components/site/animations";
import { BarreLaterale } from "@/components/site/barre-laterale";
import { FormulaireNewsletter } from "@/components/site/interactifs";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  return { alternates: alternates(lang, "/") };
}

export default async function Accueil({ params }: PageProps<"/[lang]">) {
  const lang = langueParams((await params).lang);
  const t = dico(lang);
  const une = await getUne(lang, 5);
  const [dernieres, gabon, afrique, monde, femmes, laureates, startups, cyber, evenements, videos, numeros, rubriques] = await Promise.all([
    getDernieres(lang, 9, une.map((a) => a.id)),
    getArticlesRubrique("gabon", lang, 1, 4),
    getArticlesRubrique("afrique", lang, 1, 4),
    getArticlesRubrique("monde", lang, 1, 4),
    getArticlesRubrique("femmes-du-numerique", lang, 1, 4),
    getArticlesRubrique("portraits-des-laureates", lang, 1, 3),
    getArticlesRubrique("startups-et-innovation", lang, 1, 3),
    getArticlesRubrique("cybersecurite-et-ia", lang, 1, 3),
    getArticlesRubrique("evenements-et-agenda", lang, 1, 3),
    getVideos(lang, 4),
    getNumeros(lang),
    getRubriques(lang),
  ]);
  const nomRubrique = (slug: string) => rubriques.find((r) => r.slug === slug)?.nom ?? slug;
  const aCote = dernieres.slice(0, 2);
  const fil = dernieres.slice(2);
  const toutesDernieres = [...une, ...dernieres].sort((a, b) => (b.datePublication?.getTime() ?? 0) - (a.datePublication?.getTime() ?? 0));
  const portraits = [...femmes.articles, ...laureates.articles].slice(0, 5);

  return (
    <>
      <BandeauDefilant titres={toutesDernieres.slice(0, 8).map((a) => ({ titre: a.titre, slug: a.slug, rubrique: a.rubrique.nom }))} />

      {/* 1. À la une */}
      <section className="mx-auto max-w-7xl px-4 pt-6" aria-label={t.aLaUne}>
        <div className="grid gap-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CarrouselUne
              diapos={une.map((a) => ({
                titre: a.titre,
                slug: a.slug,
                chapeau: a.chapeau,
                imageUneUrl: a.imageUneUrl,
                imageUneAlt: a.imageUneAlt,
                rubrique: { nom: a.rubrique.nom, slug: a.rubrique.slug },
                auteur: a.auteur.nom,
                date: formatDate(lang, a.datePublication),
              }))}
            />
          </div>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
            {aCote.map((a) => (
              <div key={a.id} className="h-[260px] lg:h-auto">
                <CarteSuperposee article={a} lang={lang} taille="moyenne" sizes="(min-width: 1024px) 33vw, 50vw" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Dernières actualités + barre latérale (dont la météo) */}
      <div className="mx-auto mt-14 grid max-w-7xl gap-12 px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="dernieres">
          <TitreBloc href="/recherche" lang={lang}>
            <span id="dernieres">{t.dernieresActualites}</span>
          </TitreBloc>
          <ul className="divide-y divide-ligne">
            {fil.map((a, i) => (
              <Apparition as="li" key={a.id} delai={Math.min(i, 4) * 0.05} className="py-6 first:pt-0">
                <CarteHorizontale article={a} lang={lang} />
              </Apparition>
            ))}
          </ul>
        </section>
        <BarreLaterale lang={lang} meteo />
      </div>

      {/* 3. Gabon, Afrique, Monde */}
      <section className="mt-16 border-y border-ligne bg-fond-2 py-14" aria-label={t.actualitesParRegion}>
        <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-3 md:gap-8">
          <BlocRegion titre={nomRubrique("gabon")} slug="gabon" articles={gabon.articles} lang={lang} />
          <BlocRegion titre={nomRubrique("afrique")} slug="afrique" articles={afrique.articles} lang={lang} />
          <BlocRegion titre={nomRubrique("monde")} slug="monde" articles={monde.articles} lang={lang} />
        </div>
      </section>

      {/* 4. Femmes du numérique */}
      <section className="bg-noir py-16 text-white" aria-labelledby="femmes">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-titre text-sm uppercase tracking-[0.3em] text-or">{t.portraitsLaureates}</p>
              <h2 id="femmes" className="mt-2 font-titre text-4xl font-bold uppercase sm:text-5xl">{t.femmesDuNumerique}</h2>
            </div>
            <Link href={lien(lang, "/rubrique/femmes-du-numerique")} className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/70 hover:text-or">
              {t.tousLesPortraits} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {portraits.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <Apparition className="h-[420px] lg:h-full lg:min-h-[520px]">
                <CarteSuperposee article={portraits[0]} lang={lang} sizes="(min-width: 1024px) 55vw, 100vw" />
              </Apparition>
              <div className="grid gap-6 sm:grid-cols-2">
                {portraits.slice(1, 5).map((a, i) => (
                  <Apparition key={a.id} delai={i * 0.08}>
                    <CarteVerticale article={a} lang={lang} chapeau={false} sombre sizes="(min-width: 1024px) 22vw, 50vw" />
                  </Apparition>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Dossiers à onglets */}
      <section className="mx-auto max-w-7xl px-4 py-16" aria-labelledby="dossiers">
        <TitreBloc lang={lang}>
          <span id="dossiers">{t.innovationAgenda}</span>
        </TitreBloc>
        <OngletsRubriques
          onglets={[
            { cle: "startups", libelle: nomRubrique("startups-et-innovation"), contenu: <GrilleTrois articles={startups.articles} lang={lang} /> },
            { cle: "cyber", libelle: nomRubrique("cybersecurite-et-ia"), contenu: <GrilleTrois articles={cyber.articles} lang={lang} /> },
            { cle: "evenements", libelle: nomRubrique("evenements-et-agenda"), contenu: <GrilleTrois articles={evenements.articles} lang={lang} /> },
          ]}
        />
      </section>

      {/* 6. Espace vidéo */}
      <section className="relative overflow-hidden bg-fond-sombre py-16 text-white" aria-labelledby="videos">
        <div className="absolute -left-40 top-0 size-[480px] rounded-full bg-or/10 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4">
          <TitreBloc sombre href="/videos" lang={lang}>
            <span id="videos">{t.espaceVideo}</span>
          </TitreBloc>
          {videos.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {videos.map((v, i) => (
                <Apparition key={v.id} delai={i * 0.06}>
                  <CarteVerticale article={v} lang={lang} chapeau={false} sombre sizes="(min-width: 1024px) 25vw, 50vw" />
                </Apparition>
              ))}
            </div>
          ) : (
            <div className="grid items-center gap-8 border border-white/10 bg-white/5 p-8 md:grid-cols-[auto_1fr]">
              <div className="relative grid size-28 place-items-center rounded-full bg-or text-noir">
                <Bot className="size-14" aria-hidden />
                <span className="absolute inset-0 animate-ping rounded-full border-2 border-or opacity-40 motion-reduce:animate-none" aria-hidden />
              </div>
              <div>
                <p className="font-titre text-sm uppercase tracking-[0.3em] text-or">{t.bientotEnLigne}</p>
                <h3 className="mt-2 font-titre text-3xl uppercase">{t.interviewsAfdy}</h3>
                <p className="mt-3 max-w-2xl text-white/70">
                  {t.texteAfdy} <PlayCircle className="inline size-4 text-or" aria-hidden />
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 7. Newsletter et anciens numéros (bandeau or : couleurs fixes, identiques dans les deux thèmes) */}
      <section id="newsletter" className="scroll-mt-20 bg-or py-16 text-noir" aria-labelledby="titre-newsletter">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="font-titre text-sm uppercase tracking-[0.3em] text-noir/70">{t.newsletterMensuelle}</p>
            <h2 id="titre-newsletter" className="mt-2 font-titre text-4xl font-bold uppercase leading-none sm:text-5xl">{t.neManquezAucun}</h2>
            <p className="mt-4 max-w-lg text-noir/80">{t.texteNewsletterBandeau}</p>
            <div className="mt-6 max-w-lg">
              <FormulaireNewsletter />
            </div>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {numeros.slice(0, 3).map((n, i) => (
              <Apparition key={n.id} delai={i * 0.1} className="w-44 shrink-0 sm:w-52">
                <Link href={lien(lang, `/numeros/${n.slug}`)} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden shadow-[0_22px_40px_-16px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-1deg]">
                    <Image src={n.couvertureUrl} alt={`${t.couverture} — ${n.titre}`} fill sizes="208px" className="object-cover" />
                  </div>
                  <p className="mt-3 font-titre text-sm uppercase tracking-[0.14em]">{formatDate(lang, n.mois, "mois")}</p>
                </Link>
              </Apparition>
            ))}
            <Link href={lien(lang, "/numeros")} className="grid w-36 shrink-0 place-items-center border-2 border-dashed border-noir/30 text-center font-titre text-sm uppercase tracking-[0.14em] hover:border-noir">
              {t.toutesArchives} →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function BlocRegion({ titre, slug, articles, lang }: { titre: string; slug: string; articles: CarteArticle[]; lang: Langue }) {
  const [premier, ...autres] = articles;
  return (
    <div>
      <TitreBloc href={`/rubrique/${slug}`} lang={lang}>{titre}</TitreBloc>
      {premier ? (
        <div className="space-y-6">
          <Apparition>
            <CarteVerticale article={premier} lang={lang} sizes="(min-width: 768px) 33vw, 100vw" />
          </Apparition>
          <ul className="space-y-5 border-t border-ligne pt-6">
            {autres.slice(0, 3).map((a) => (
              <li key={a.id}>
                <CarteMini article={a} lang={lang} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-texte-doux">{dico(lang).rubriqueVide}</p>
      )}
    </div>
  );
}

function GrilleTrois({ articles, lang }: { articles: CarteArticle[]; lang: Langue }) {
  if (articles.length === 0) return <p className="text-sm text-texte-doux">{dico(lang).aucunArticle}</p>;
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {articles.map((a) => (
        <CarteVerticale key={a.id} article={a} lang={lang} />
      ))}
    </div>
  );
}
