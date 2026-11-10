"use client";

import Link from "next/link";
import { useLangue } from "@/components/i18n/contexte";
import { lien } from "@/lib/i18n";

export default function Introuvable() {
  const { lang, t } = useLangue();
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-titre text-8xl font-bold text-or">404</p>
      <h1 className="mt-4 font-titre text-3xl uppercase">{t.pageIntrouvable}</h1>
      <p className="mt-3 text-texte-doux">{t.pageIntrouvableTexte}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href={lien(lang, "/")} className="inline-flex h-11 items-center bg-noir px-5 font-titre uppercase tracking-[0.12em] text-white hover:bg-or hover:text-noir">{t.accueil}</Link>
        <Link href={lien(lang, "/recherche")} className="inline-flex h-11 items-center border border-ligne px-5 font-titre uppercase tracking-[0.12em] hover:border-or">{t.rechercher}</Link>
      </div>
    </div>
  );
}
