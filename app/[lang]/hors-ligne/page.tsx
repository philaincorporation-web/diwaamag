import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { dico, lien } from "@/lib/i18n";
import { langueParams } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/hors-ligne">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  return { title: dico(lang).horsLigne, robots: { index: false } };
}

export default async function HorsLigne({ params }: PageProps<"/[lang]/hors-ligne">) {
  const lang = langueParams((await params).lang);
  const t = dico(lang);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <WifiOff className="mx-auto size-16 text-or" aria-hidden />
      <h1 className="mt-6 font-titre text-4xl uppercase">{t.horsLigne}</h1>
      <p className="mt-4 text-texte-doux">{t.horsLigneTexte}</p>
      <Link href={lien(lang, "/")} className="mt-8 inline-flex h-12 items-center bg-noir px-6 font-titre uppercase tracking-[0.12em] text-white hover:bg-or hover:text-noir">
        {t.retourAccueil}
      </Link>
    </div>
  );
}
