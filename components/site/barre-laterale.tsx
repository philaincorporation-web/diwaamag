import Image from "next/image";
import Link from "next/link";
import { CloudSun, Mail } from "lucide-react";
import { getMotsClesPopulaires, getNumeros, getPlusLus } from "@/lib/data";
import { dico, formatDate, lien, type Langue } from "@/lib/i18n";
import { CarteClassement, TitreBloc } from "@/components/site/cartes";
import { FormulaireNewsletter } from "@/components/site/interactifs";
import { DetailMeteo } from "@/components/site/meteo";
import { Pub } from "@/components/site/pub";
import { IconeMarque } from "@/components/site/reseaux";
import { imageOptimisable } from "@/lib/images";

export async function BlocPlusLus({ lang }: { lang: Langue }) {
  const articles = await getPlusLus(lang, 5);
  return (
    <section aria-labelledby="plus-lus">
      <TitreBloc as="h2" lang={lang}>
        <span id="plus-lus">{dico(lang).lesPlusLus}</span>
      </TitreBloc>
      <ol className="-mt-4 divide-y divide-ligne">
        {articles.map((a, i) => (
          <li key={a.id}>
            <CarteClassement article={a} lang={lang} rang={i + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Chaîne WhatsApp (adresse dans NEXT_PUBLIC_WHATSAPP_CHAINE ; bloc masqué si elle est vide). */
export function BlocWhatsApp({ lang }: { lang: Langue }) {
  const url = process.env.NEXT_PUBLIC_WHATSAPP_CHAINE;
  if (!url) return null;
  const t = dico(lang);
  return (
    <section className="bg-[#0b3d2e] p-6 text-white" aria-labelledby="whatsapp-titre">
      <p id="whatsapp-titre" className="flex items-center gap-2 font-titre text-lg uppercase tracking-wide">
        <IconeMarque nom="whatsapp" className="size-5 text-[#25D366]" /> {t.whatsappTitre}
      </p>
      <p className="mt-2 text-sm text-white/80">{t.whatsappTexte}</p>
      <a href={url} target="_blank" rel="noopener" className="mt-4 inline-flex h-10 items-center gap-2 bg-[#25D366] px-4 text-sm font-bold text-noir hover:bg-white">
        {t.whatsappBouton}
      </a>
    </section>
  );
}

export function BlocNewsletter({ lang }: { lang: Langue }) {
  const t = dico(lang);
  return (
    <section className="relative overflow-hidden bg-noir p-6 text-white">
      <div className="absolute -right-8 -top-8 size-32 rounded-full bg-or/20" aria-hidden />
      <Mail className="relative size-8 text-or" aria-hidden />
      <h2 className="relative mt-3 font-titre text-2xl uppercase">{t.laNewsletter}</h2>
      <p className="relative mt-2 text-sm text-white/75">{t.texteNewsletter}</p>
      <div className="relative mt-4">
        <FormulaireNewsletter sombre compact />
      </div>
    </section>
  );
}

export function BlocMeteo({ lang }: { lang: Langue }) {
  return (
    <section aria-labelledby="bloc-meteo" className="border border-ligne bg-fond p-5">
      <h2 id="bloc-meteo" className="mb-4 flex items-center gap-2 font-titre text-xl uppercase text-encre">
        <CloudSun className="size-5 text-or" aria-hidden /> {dico(lang).meteo}
      </h2>
      <DetailMeteo />
    </section>
  );
}

export async function BlocNumero({ lang }: { lang: Langue }) {
  const numeros = await getNumeros(lang);
  const n = numeros[0];
  if (!n) return null;
  return (
    <section aria-labelledby="numero-mois">
      <TitreBloc as="h2" lang={lang}>
        <span id="numero-mois">{dico(lang).leNumero}</span>
      </TitreBloc>
      <Link href={lien(lang, `/numeros/${n.slug}`)} className="group block">
        <div className="relative aspect-[3/4] overflow-hidden shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)]">
          <Image src={n.couvertureUrl} unoptimized={!imageOptimisable(n.couvertureUrl)} alt={`${dico(lang).couverture} — ${n.titre}`} fill sizes="320px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
        <p className="mt-3 font-titre text-xs uppercase tracking-[0.18em] text-or-fonce">{formatDate(lang, n.mois, "mois")}</p>
        <p className="mt-1 font-semibold leading-snug group-hover:text-or-fonce">{n.titre}</p>
      </Link>
    </section>
  );
}

export async function BlocMotsCles({ lang }: { lang: Langue }) {
  const mots = await getMotsClesPopulaires(16);
  if (mots.length === 0) return null;
  return (
    <section aria-labelledby="mots-cles">
      <TitreBloc as="h2" lang={lang}>
        <span id="mots-cles">{dico(lang).motsCles}</span>
      </TitreBloc>
      <ul className="flex flex-wrap gap-2">
        {mots.map((m) => (
          <li key={m.id}>
            <Link
              href={lien(lang, `/mot-cle/${m.slug}`)}
              className="block border border-ligne px-3 py-1.5 text-xs font-medium transition-colors hover:border-or hover:bg-or hover:text-noir"
            >
              {m.nom}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BarreLaterale({ lang, numero = true, meteo = false }: { lang: Langue; numero?: boolean; meteo?: boolean }) {
  return (
    <aside className="space-y-12">
      <BlocPlusLus lang={lang} />
      <Pub emplacement="BARRE_LATERALE" format="pave" />
      {meteo && <BlocMeteo lang={lang} />}
      <BlocNewsletter lang={lang} />
      <BlocWhatsApp lang={lang} />
      {numero && <BlocNumero lang={lang} />}
      <BlocMotsCles lang={lang} />
    </aside>
  );
}
