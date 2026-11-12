import type { MetadataRoute } from "next";
import { getIndexPublic } from "@/lib/data";
import { siteUrl } from "@/lib/format";
import { lien } from "@/lib/i18n";

type Entree = MetadataRoute.Sitemap[number];

/** Une entrée par page et par langue, avec les correspondances hreflang. */
function bilingue(chemin: string, extra: Omit<Entree, "url" | "alternates"> = {}): Entree[] {
  const languages = { fr: siteUrl(lien("fr", chemin)), en: siteUrl(lien("en", chemin)) };
  return [
    { url: languages.fr, alternates: { languages }, ...extra },
    { url: languages.en, alternates: { languages }, ...extra },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, rubriques, numeros, motsCles, auteurs } = await getIndexPublic();
  return [
    ...["/", "/numeros", "/videos", "/a-propos", "/contact", "/annonceurs"].flatMap((p) => bilingue(p, { changeFrequency: "daily", priority: p === "/" ? 1 : 0.5 })),
    ...articles.flatMap((a) =>
      bilingue(`/article/${a.slug}`, {
        lastModified: a.dateMiseAJour ?? a.datePublication ?? undefined,
        priority: 0.8,
        images: a.imageUneUrl ? [a.imageUneUrl.startsWith("/") ? siteUrl(a.imageUneUrl) : a.imageUneUrl] : undefined,
      }),
    ),
    ...rubriques.flatMap((r) => bilingue(`/rubrique/${r.slug}`, { changeFrequency: "daily", priority: 0.7 })),
    ...numeros.flatMap((n) => bilingue(`/numeros/${n.slug}`, { lastModified: n.mois, priority: 0.6 })),
    ...auteurs.flatMap((a) => bilingue(`/auteur/${a.id}`, { priority: 0.3 })),
    ...motsCles.flatMap((m) => bilingue(`/mot-cle/${m.slug}`, { priority: 0.3 })),
  ];
}
