// Outils autour du contenu riche (format JSON de Tiptap / ProseMirror).
// Ce module est utilisable côté serveur, côté client et dans le script de seed.

export type TiptapMark = { type: string; attrs?: Record<string, unknown> };
export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
};
export type TiptapDoc = { type: "doc"; content: TiptapNode[] };

export const DOCUMENT_VIDE: TiptapDoc = { type: "doc", content: [{ type: "paragraph" }] };

/** Convertit un texte en slug d'URL (minuscules, sans accents). */
export function slugify(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/** Extrait le texte brut d'un document Tiptap. */
export function texteBrut(node: TiptapNode | TiptapDoc | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return (node as TiptapNode).text ?? "";
  const enfants = (node.content ?? []).map((n) => texteBrut(n));
  const bloc = ["paragraph", "heading", "blockquote", "listItem"].includes(node.type);
  return enfants.join(bloc ? " " : "\n").trim();
}

/** Temps de lecture estimé en minutes (230 mots par minute). */
export function tempsDeLecture(doc: TiptapDoc | TiptapNode | null | undefined): number {
  const mots = texteBrut(doc).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(mots / 230));
}

/** Liste des intertitres (h2/h3) pour un sommaire d'article. */
export function intertitres(doc: TiptapDoc | null | undefined) {
  return (doc?.content ?? [])
    .filter((n) => n.type === "heading")
    .map((n) => ({ niveau: Number(n.attrs?.level ?? 2), texte: texteBrut(n) }));
}

export function inlineMarkdown(texte: string): TiptapNode[] {
  // Gère **gras** et *italique* — suffisant pour l'import initial.
  const noeuds: TiptapNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let dernier = 0;
  for (const m of texte.matchAll(regex)) {
    if (m.index! > dernier) noeuds.push({ type: "text", text: texte.slice(dernier, m.index) });
    const brut = m[0];
    if (brut.startsWith("**")) {
      noeuds.push({ type: "text", text: brut.slice(2, -2), marks: [{ type: "bold" }] });
    } else {
      noeuds.push({ type: "text", text: brut.slice(1, -1), marks: [{ type: "italic" }] });
    }
    dernier = m.index! + brut.length;
  }
  if (dernier < texte.length) noeuds.push({ type: "text", text: texte.slice(dernier) });
  return noeuds.filter((n) => n.text);
}

/** Convertit un Markdown simple (##, >, -, 1., **) en document Tiptap. */
export function markdownVersTiptap(markdown: string): TiptapDoc {
  const blocs = markdown.trim().split(/\n\s*\n/);
  const content: TiptapNode[] = [];
  for (const bloc of blocs) {
    const lignes = bloc.split("\n").map((l) => l.trimEnd());
    const premiere = lignes[0];
    if (/^#{2,3} /.test(premiere)) {
      const level = premiere.startsWith("### ") ? 3 : 2;
      content.push({
        type: "heading",
        attrs: { level },
        content: inlineMarkdown(premiere.replace(/^#{2,3} /, "")),
      });
    } else if (premiere.startsWith("> ")) {
      content.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: inlineMarkdown(lignes.map((l) => l.replace(/^> ?/, "")).join(" ")) }],
      });
    } else if (lignes.every((l) => /^- /.test(l))) {
      content.push({
        type: "bulletList",
        content: lignes.map((l) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: inlineMarkdown(l.slice(2)) }],
        })),
      });
    } else if (lignes.every((l) => /^\d+\. /.test(l))) {
      content.push({
        type: "orderedList",
        attrs: { start: 1 },
        content: lignes.map((l) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: inlineMarkdown(l.replace(/^\d+\. /, "")) }],
        })),
      });
    } else {
      content.push({ type: "paragraph", content: inlineMarkdown(lignes.join(" ")) });
    }
  }
  return { type: "doc", content };
}
