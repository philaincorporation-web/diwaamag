"use client";

import { createContext, use } from "react";
import { dico, type Dictionnaire, type Langue } from "@/lib/i18n";

const ContexteLangue = createContext<Langue>("fr");

export function FournisseurLangue({ lang, children }: { lang: Langue; children: React.ReactNode }) {
  return <ContexteLangue value={lang}>{children}</ContexteLangue>;
}

/** Langue courante et dictionnaire, pour les composants client. */
export function useLangue(): { lang: Langue; t: Dictionnaire } {
  const lang = use(ContexteLangue);
  return { lang, t: dico(lang) };
}
