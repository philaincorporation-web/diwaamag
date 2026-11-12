import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getNumeros } from "@/lib/data";
import { dico, formatDate, lien } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { EnTetePage } from "@/components/site/liste";
import { Apparition } from "@/components/site/animations";
import { imageOptimisable } from "@/lib/images";

export async function generateMetadata({ params }: PageProps<"/[lang]/numeros">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  const t = dico(lang);
  return { title: t.anciensNumeros, description: t.numerosDescription, alternates: alternates(lang, "/numeros") };
}

export default async function PageNumeros({ params }: PageProps<"/[lang]/numeros">) {
  const lang = langueParams((await params).lang);
  const t = dico(lang);
  const numeros = await getNumeros(lang);
  return (
    <>
      <EnTetePage surtitre={t.archives} titre={t.lesNumeros} description={t.numerosDescription} />
      <div className="mx-auto max-w-7xl px-4 py-12">
        {numeros.length === 0 ? (
          <p className="text-center text-texte-doux">{t.aucunNumero}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
            {numeros.map((n, i) => (
              <Apparition as="li" key={n.id} delai={(i % 4) * 0.06}>
                <Link href={lien(lang, `/numeros/${n.slug}`)} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden shadow-[0_22px_40px_-18px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:-translate-y-2">
                    <Image src={n.couvertureUrl} unoptimized={!imageOptimisable(n.couvertureUrl)} alt={`${t.couverture} — ${n.titre}`} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                  </div>
                  <p className="mt-4 font-titre text-sm uppercase tracking-[0.16em] text-or-fonce">{formatDate(lang, n.mois, "mois")}</p>
                  <p className="mt-1 font-semibold leading-snug group-hover:text-or-fonce">{n.titre}</p>
                  <p className="mt-1 text-xs text-texte-doux">
                    {n._count.articles} {t.articles}
                    {n.pdfUrl ? ` · ${t.pdfDisponible}` : ""}
                  </p>
                </Link>
              </Apparition>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
