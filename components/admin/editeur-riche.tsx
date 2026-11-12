"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  Unlink,
  Clapperboard as IconeVideo,
  Captions,
  Trash2,
} from "lucide-react";
import type { TiptapDoc } from "@/lib/content";
import { SelecteurMedia, type MediaLeger } from "@/components/admin/mediatheque";
import { cn } from "@/lib/cn";

function Outil({ actif, onClick, label, children, desactive }: { actif?: boolean; onClick: () => void; label: string; children: React.ReactNode; desactive?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={desactive}
      title={label}
      aria-label={label}
      aria-pressed={actif}
      className={cn("grid size-9 place-items-center transition-colors disabled:opacity-30", actif ? "bg-noir text-or" : "hover:bg-fond-2")}
    >
      {children}
    </button>
  );
}

function BarreOutils({ editor, medias }: { editor: Editor; medias: MediaLeger[] }) {
  const e = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      gras: ed.isActive("bold"),
      italique: ed.isActive("italic"),
      barre: ed.isActive("strike"),
      h2: ed.isActive("heading", { level: 2 }),
      h3: ed.isActive("heading", { level: 3 }),
      puces: ed.isActive("bulletList"),
      numeros: ed.isActive("orderedList"),
      citation: ed.isActive("blockquote"),
      lien: ed.isActive("link"),
      image: ed.isActive("image"),
      annuler: ed.can().undo(),
      refaire: ed.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const lien = () => {
    const actuel = editor.getAttributes("link").href as string | undefined;
    const url = prompt("Adresse du lien (https://…)", actuel ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") c().unsetLink().run();
    else c().extendMarkRange("link").setLink({ href: url }).run();
  };
  const video = () => {
    const url = prompt("Lien de la vidéo YouTube (dont les interventions de l'avatar AFDY)");
    if (url) c().setYoutubeVideo({ src: url }).run();
  };
  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 border-b border-ligne bg-fond p-1 lg:top-0">
      <Outil label="Gras" actif={e.gras} onClick={() => c().toggleBold().run()}><Bold className="size-4" /></Outil>
      <Outil label="Italique" actif={e.italique} onClick={() => c().toggleItalic().run()}><Italic className="size-4" /></Outil>
      <Outil label="Barré" actif={e.barre} onClick={() => c().toggleStrike().run()}><Strikethrough className="size-4" /></Outil>
      <span className="mx-1 h-6 w-px bg-ligne" />
      <Outil label="Intertitre" actif={e.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Outil>
      <Outil label="Sous-intertitre" actif={e.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Outil>
      <Outil label="Liste à puces" actif={e.puces} onClick={() => c().toggleBulletList().run()}><List className="size-4" /></Outil>
      <Outil label="Liste numérotée" actif={e.numeros} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="size-4" /></Outil>
      <Outil label="Citation" actif={e.citation} onClick={() => c().toggleBlockquote().run()}><Quote className="size-4" /></Outil>
      <Outil label="Séparateur" onClick={() => c().setHorizontalRule().run()}><Minus className="size-4" /></Outil>
      <span className="mx-1 h-6 w-px bg-ligne" />
      <Outil label="Lien" actif={e.lien} onClick={lien}><Link2 className="size-4" /></Outil>
      {e.lien && <Outil label="Retirer le lien" onClick={() => c().unsetLink().run()}><Unlink className="size-4" /></Outil>}
      <Outil label="Vidéo YouTube" onClick={video}><IconeVideo className="size-4" /></Outil>
      <span className="ml-1">
        <SelecteurMedia
          medias={medias}
          libelle="Image"
          onChoisir={(m) => c().setImage({ src: m.url, alt: m.texteAlternatif, title: m.legende ?? undefined }).run()}
        />
      </span>
      {e.image && (
        <Outil label="Légende de l'image" actif onClick={() => document.getElementById("legende-image")?.focus()}>
          <Captions className="size-4" />
        </Outil>
      )}
      <span className="ml-auto flex">
        <Outil label="Annuler" desactive={!e.annuler} onClick={() => c().undo().run()}><Undo2 className="size-4" /></Outil>
        <Outil label="Rétablir" desactive={!e.refaire} onClick={() => c().redo().run()}><Redo2 className="size-4" /></Outil>
      </span>
    </div>
  );
}

/** Légende et texte alternatif de l'image sélectionnée (clic sur une image dans le texte). */
function PanneauImage({ editor }: { editor: Editor }) {
  const img = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed.isActive("image")) return null;
      const a = ed.getAttributes("image");
      return { src: String(a.src ?? ""), alt: String(a.alt ?? ""), legende: String(a.title ?? "") };
    },
  });
  if (!img) {
    return (
      <p className="border-b border-ligne bg-fond-2/60 px-3 py-1.5 text-xs text-texte-doux">
        Astuce : cliquez sur une image du texte pour modifier sa légende et son texte alternatif.
      </p>
    );
  }
  // Pas de focus() : la saisie reste dans le champ, l'image reste sélectionnée.
  const maj = (attrs: Record<string, string | null>) => editor.chain().updateAttributes("image", attrs).run();
  return (
    <div className="grid gap-3 border-b border-or/50 bg-or-clair/40 px-3 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Légende (affichée sous l&apos;image)</span>
        <input
          id="legende-image"
          className="h-9 w-full border border-ligne bg-fond px-2 outline-none focus:border-or"
          value={img.legende}
          maxLength={300}
          placeholder="Ex. : Remise des prix à Libreville, décembre 2025. © Studio Akanda"
          onChange={(ev) => maj({ title: ev.target.value || null })}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Texte alternatif (lecteurs d&apos;écran)</span>
        <input
          className="h-9 w-full border border-ligne bg-fond px-2 outline-none focus:border-or"
          value={img.alt}
          maxLength={300}
          placeholder="Ce que montre l'image"
          onChange={(ev) => maj({ alt: ev.target.value })}
        />
      </label>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteSelection().run()}
        className="inline-flex h-9 items-center gap-1 border border-danger/30 bg-fond px-3 text-sm font-semibold text-danger hover:bg-danger hover:text-white"
      >
        <Trash2 className="size-4" aria-hidden /> Retirer l&apos;image
      </button>
    </div>
  );
}

export function EditeurRiche({ initial, onChange, medias }: { initial: TiptapDoc; onChange: (doc: TiptapDoc) => void; medias: MediaLeger[] }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener nofollow" } },
      }),
      ImageExt.configure({ HTMLAttributes: { class: "max-w-full" } }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder: "Rédigez votre article… Utilisez les intertitres pour structurer la lecture." }),
    ],
    content: initial,
    editorProps: { attributes: { class: "corps-article sans-lettrine px-6 py-5", "aria-label": "Contenu de l'article" } },
    onUpdate: ({ editor: ed }) => onChange(ed.getJSON() as TiptapDoc),
  });
  return (
    <div className="editeur border border-ligne bg-fond focus-within:border-or">
      {editor ? (
        <>
          <BarreOutils editor={editor} medias={medias} />
          <PanneauImage editor={editor} />
        </>
      ) : (
        <div className="h-11 border-b border-ligne" />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
