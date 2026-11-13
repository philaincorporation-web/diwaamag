// Lecture d'un flux RSS 2.0 ou Atom (dont les flux Google Alerts) et normalisation des entrées.
// Le flux est une donnée non fiable : aucune entité externe n'est résolue, le HTML est retiré,
// la taille et la durée de téléchargement sont limitées.
import "server-only";
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { normaliser } from "./classement";

export type EntreeFlux = { titre: string; extrait: string; url: string; urlCanonique: string; empreinte: string; imageUrl: string | null; date: Date };

const TAILLE_MAX = 4 * 1024 * 1024;
const ENTREES_MAX = 60;
const EXTRAIT_MAX = 280;

export class ErreurFlux extends Error {}

const analyseur = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
  parseTagValue: false,
});

async function telecharger(url: string) {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DiwaMagVeille/1.0; +https://digiewomenawards.com)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (e) {
    throw new ErreurFlux(e instanceof Error && e.name === "TimeoutError" ? "Délai dépassé (15 s)." : "Source injoignable.");
  }
  if (!res.ok) throw new ErreurFlux(`Réponse HTTP ${res.status}.`);
  const longueur = Number(res.headers.get("content-length") ?? 0);
  if (longueur > TAILLE_MAX) throw new ErreurFlux("Flux trop volumineux.");
  const texte = await res.text();
  if (texte.length > TAILLE_MAX) throw new ErreurFlux("Flux trop volumineux.");
  if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(texte.slice(0, 2000))) throw new ErreurFlux("Ce n'est pas un flux RSS ou Atom (page web reçue).");
  return texte;
}

type Noeud = Record<string, unknown>;
const tableau = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const texteDe = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return texteDe(v[0]);
  if (typeof v === "object") return texteDe((v as Noeud)["#text"]);
  return "";
};

/** Retire le HTML et décode les entités courantes ; espaces normalisés. */
export function texteBrutHtml(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, "’")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function couper(texte: string, max = EXTRAIT_MAX) {
  if (texte.length <= max) return texte;
  return texte.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/** Adresse canonique : sans paramètres de suivi, sans ancre, sans « www », sans barre finale. */
export function urlCanonique(brute: string) {
  let u: URL;
  try {
    u = new URL(brute);
  } catch {
    return brute.trim();
  }
  // Liens Google Alerts : https://www.google.com/url?…&url=<adresse réelle>
  if (/(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname === "/url" && u.searchParams.get("url")) return urlCanonique(u.searchParams.get("url")!);
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  for (const cle of [...u.searchParams.keys()]) {
    if (/^(utm_|at_|mc_|pk_)|^(fbclid|gclid|dclid|msclkid|ref|ref_src|cmpid|ocid|xtor|ncid|guccounter|smid|taid|rss|feed)$/i.test(cle)) u.searchParams.delete(cle);
  }
  u.searchParams.sort();
  let s = `${u.protocol === "http:" ? "https:" : u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}`;
  const q = u.searchParams.toString();
  if (q) s += `?${q}`;
  return s;
}

/** Lien réel d'une entrée (les liens Google Alerts passent par une redirection google.com/url). */
function lienReel(brut: string) {
  try {
    const u = new URL(brut);
    if (/(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname === "/url" && u.searchParams.get("url")) return u.searchParams.get("url")!;
    return u.toString();
  } catch {
    return "";
  }
}

const empreinteDe = (titre: string) => createHash("sha1").update(normaliser(titre).trim().slice(0, 160)).digest("hex");

function imageDe(n: Noeud, html: string): string | null {
  const candidats: unknown[] = [
    ...tableau(n["media:content"] as Noeud | Noeud[]).map((m) => (m?.["@_medium"] === "image" || /\.(jpe?g|png|webp|gif)/i.test(String(m?.["@_url"] ?? "")) ? m?.["@_url"] : null)),
    ...tableau(n["media:thumbnail"] as Noeud | Noeud[]).map((m) => m?.["@_url"]),
    ...tableau((n["media:group"] as Noeud | undefined)?.["media:content"] as Noeud | Noeud[]).map((m) => m?.["@_url"]),
    ...tableau(n.enclosure as Noeud | Noeud[]).map((m) => (String(m?.["@_type"] ?? "").startsWith("image") ? m?.["@_url"] : null)),
    html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1],
  ];
  for (const c of candidats) if (typeof c === "string" && /^https:\/\//i.test(c)) return c;
  return null;
}

function dateDe(...valeurs: unknown[]) {
  for (const v of valeurs) {
    const d = new Date(texteDe(v));
    if (!Number.isNaN(d.getTime())) return d.getTime() > Date.now() + 3_600_000 ? new Date() : d;
  }
  return new Date();
}

export async function lireFlux(url: string): Promise<EntreeFlux[]> {
  const xml = await telecharger(url);
  let doc: Noeud;
  try {
    doc = analyseur.parse(xml) as Noeud;
  } catch {
    throw new ErreurFlux("Flux XML illisible.");
  }
  const rss = doc.rss as Noeud | undefined;
  const rdf = doc["rdf:RDF"] as Noeud | undefined;
  const atom = doc.feed as Noeud | undefined;
  const brutes: { titre: string; lien: string; html: string; image: string | null; date: Date }[] = [];

  if (rss || rdf) {
    const items = tableau(((rss?.channel as Noeud | undefined)?.item ?? rdf?.item) as Noeud | Noeud[]);
    for (const it of items.slice(0, ENTREES_MAX)) {
      const html = texteDe(it.description) || texteDe(it["content:encoded"]);
      const lien = texteDe(it.link) || (String((it.guid as Noeud)?.["@_isPermaLink"]) !== "false" ? texteDe(it.guid) : "");
      brutes.push({ titre: texteDe(it.title), lien, html: html || texteDe(it["content:encoded"]), image: imageDe(it, `${html}${texteDe(it["content:encoded"])}`), date: dateDe(it.pubDate, it["dc:date"], it.updated) });
    }
  } else if (atom) {
    for (const e of tableau(atom.entry as Noeud | Noeud[]).slice(0, ENTREES_MAX)) {
      const liens = tableau(e.link as Noeud | Noeud[] | string);
      const alterne = liens.find((l) => typeof l === "object" && (!l["@_rel"] || l["@_rel"] === "alternate")) as Noeud | undefined;
      const lien = typeof liens[0] === "string" ? (liens[0] as string) : String(alterne?.["@_href"] ?? (liens[0] as Noeud | undefined)?.["@_href"] ?? "");
      const html = texteDe(e.summary) || texteDe(e.content);
      brutes.push({ titre: texteDe(e.title), lien, html, image: imageDe(e, html), date: dateDe(e.published, e.updated) });
    }
  } else {
    throw new ErreurFlux("Format de flux non reconnu.");
  }

  const entrees: EntreeFlux[] = [];
  for (const b of brutes) {
    const titre = couper(texteBrutHtml(b.titre), 300);
    const url = lienReel(b.lien.trim());
    if (!titre || !/^https?:\/\//i.test(url)) continue;
    entrees.push({
      titre,
      extrait: couper(texteBrutHtml(b.html)),
      url,
      urlCanonique: urlCanonique(url),
      empreinte: empreinteDe(titre),
      imageUrl: b.image,
      date: b.date,
    });
  }
  return entrees;
}
