// Traduction automatique (DeepL) — facultative, activée par DEEPL_API_KEY.
// Le contenu Tiptap est traduit nœud de texte par nœud de texte : la mise en forme (gras, liens, intertitres) est conservée.
import "server-only";
import type { TiptapDoc, TiptapNode } from "@/lib/content";

export function traductionAutoDisponible() {
  return Boolean(process.env.DEEPL_API_KEY);
}

async function deepl(textes: string[], cible: "EN-GB" | "FR"): Promise<string[]> {
  const cle = process.env.DEEPL_API_KEY;
  if (!cle) throw new Error("DEEPL_API_KEY absente");
  const hote = cle.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const resultats: string[] = [];
  for (let i = 0; i < textes.length; i += 50) {
    const lot = textes.slice(i, i + 50);
    const r = await fetch(`${hote}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: lot, source_lang: cible === "FR" ? "EN" : "FR", target_lang: cible, preserve_formatting: true }),
    });
    if (!r.ok) throw new Error(`DeepL ${r.status} : ${await r.text()}`);
    const d = (await r.json()) as { translations: { text: string }[] };
    resultats.push(...d.translations.map((t) => t.text));
  }
  return resultats;
}

function collecter(n: TiptapNode, acc: TiptapNode[]) {
  if (n.type === "text" && n.text?.trim()) acc.push(n);
  n.content?.forEach((c) => collecter(c, acc));
}

/** Traduit titre, chapeau et contenu d'un article du français vers l'anglais. */
export async function traduireArticle(source: { titre: string; chapeau: string; contenu: TiptapDoc }) {
  const doc = structuredClone(source.contenu) as TiptapDoc;
  const noeuds: TiptapNode[] = [];
  doc.content?.forEach((n) => collecter(n, noeuds));
  const traduits = await deepl([source.titre, source.chapeau, ...noeuds.map((n) => n.text!)], "EN-GB");
  noeuds.forEach((n, i) => {
    // Conserve les espaces de bord (DeepL les supprime parfois entre deux marques).
    const avant = n.text!.match(/^\s*/)![0];
    const apres = n.text!.match(/\s*$/)![0];
    n.text = avant + traduits[i + 2].trim() + apres;
  });
  return { titre: traduits[0], chapeau: traduits[1], contenu: doc };
}
