// Conversion du résultat d'analyse (blocs éditoriaux) vers le format de contenu de l'éditeur
// (Tiptap JSON), celui qu'utilisent déjà l'éditeur du back-office et l'affichage public.
import { inlineMarkdown, type TiptapDoc, type TiptapNode } from "@/lib/content";
import type { Bloc } from "./schema";

export type ImageResolue = { url: string; alt: string; legende: string | null; credit: string | null };

const paragraphe = (texte: string): TiptapNode => {
  const contenu = inlineMarkdown(texte.trim());
  return contenu.length ? { type: "paragraph", content: contenu } : { type: "paragraph" };
};

/** Légende affichée sous l'image : « Légende — Crédit ». */
export function texteLegende(legende: string | null, credit: string | null) {
  return [legende?.trim(), credit?.trim() ? (credit.trim().startsWith("©") ? credit.trim() : `© ${credit.trim()}`) : ""].filter(Boolean).join(" — ");
}

export function blocsVersTiptap(blocs: Bloc[], images: Map<string, ImageResolue>): TiptapDoc {
  const contenu: TiptapNode[] = [];
  for (const b of blocs) {
    switch (b.type) {
      case "intertitre":
        if (b.texte.trim()) contenu.push({ type: "heading", attrs: { level: b.niveau === 3 ? 3 : 2 }, content: [{ type: "text", text: b.texte.trim() }] });
        break;
      case "paragraphe":
        for (const morceau of b.texte.split(/\n{2,}/)) if (morceau.trim()) contenu.push(paragraphe(morceau));
        break;
      case "citation": {
        if (!b.texte.trim()) break;
        const enfants = [paragraphe(b.texte)];
        if (b.attribution?.trim()) enfants.push({ type: "paragraph", content: [{ type: "text", text: `— ${b.attribution.trim()}`, marks: [{ type: "italic" }] }] });
        contenu.push({ type: "blockquote", content: enfants });
        break;
      }
      case "liste": {
        const elements = (b.elements ?? []).filter((e) => e.trim());
        if (!elements.length) break;
        contenu.push({
          type: b.ordonnee ? "orderedList" : "bulletList",
          content: elements.map((e) => ({ type: "listItem", content: [paragraphe(e)] })),
        });
        break;
      }
      case "encadre": {
        if (!b.texte.trim() && !b.titre?.trim()) break;
        contenu.push({ type: "horizontalRule" });
        if (b.titre?.trim()) contenu.push({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: b.titre.trim() }] });
        for (const morceau of b.texte.split(/\n{2,}/)) if (morceau.trim()) contenu.push(paragraphe(morceau));
        contenu.push({ type: "horizontalRule" });
        break;
      }
      case "image": {
        const img = b.imageId ? images.get(b.imageId) : undefined;
        if (!img) break;
        const titre = texteLegende(img.legende, img.credit);
        contenu.push({ type: "image", attrs: { src: img.url, alt: img.alt, title: titre || null } });
        break;
      }
    }
  }
  return { type: "doc", content: contenu.length ? contenu : [{ type: "paragraph" }] };
}
