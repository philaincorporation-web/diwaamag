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

/** Paramètres pré-générés au build. Avec Cache Components, `generateStaticParams` doit renvoyer au
 *  moins un résultat : sur une base encore vide (premier déploiement avant le seed), on renvoie un
 *  identifiant fictif dont la page répond 404. Les vraies pages sont générées à la demande ensuite. */
export function auMoinsUn<C extends string>(cle: C, valeurs: string[]): Record<C, string>[] {
  const liste = valeurs.length ? valeurs : ["_vide"];
  return liste.map((v) => ({ [cle]: v }) as Record<C, string>);
}
