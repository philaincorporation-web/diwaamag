import { getIndexPublic } from "@/lib/data";
import { siteUrl } from "@/lib/format";

const x = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export async function GET() {
  const { articles } = await getIndexPublic();
  const items = articles
    .slice(0, 50)
    .map((a) => {
      const lien = siteUrl(`/fr/article/${a.slug}`);
      const image = a.imageUneUrl ? (a.imageUneUrl.startsWith("/") ? siteUrl(a.imageUneUrl) : a.imageUneUrl) : null;
      return `<item>
  <title>${x(a.titre)}</title>
  <link>${lien}</link>
  <guid isPermaLink="true">${lien}</guid>
  <description>${x(a.chapeau)}</description>
  <category>${x(a.rubrique.nom)}</category>
  <dc:creator>${x(a.auteur.nom)}</dc:creator>
  ${a.datePublication ? `<pubDate>${a.datePublication.toUTCString()}</pubDate>` : ""}
  ${image ? `<enclosure url="${x(image)}" type="image/jpeg" length="0" />` : ""}
</item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>DIWA MAG — Le magazine de la femme digitale</title>
  <link>${siteUrl()}</link>
  <atom:link href="${siteUrl("/rss.xml")}" rel="self" type="application/rss+xml" />
  <description>L'actualité du numérique au Gabon, en Afrique et dans le monde, par les DigieWomen Awards Africa.</description>
  <language>fr</language>
${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
