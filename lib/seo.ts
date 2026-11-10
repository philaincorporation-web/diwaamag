import type { Metadata } from "next";
import { lien, type Langue } from "@/lib/i18n";

/** URL canonique + versions linguistiques (hreflang) d'une page. */
export function alternates(lang: Langue, chemin: string): Metadata["alternates"] {
  return {
    canonical: lien(lang, chemin),
    languages: { fr: lien("fr", chemin), en: lien("en", chemin), "x-default": lien("fr", chemin) },
  };
}

export function langueParams(lang: string): Langue {
  return lang === "en" ? "en" : "fr";
}
