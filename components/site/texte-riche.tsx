// Rendu serveur sécurisé du contenu Tiptap (JSON) en éléments React — aucun HTML brut n'est injecté.
import Image from "next/image";
import { Fragment } from "react";
import type { TiptapDoc, TiptapMark, TiptapNode } from "@/lib/content";
import { slugify, texteBrut } from "@/lib/content";

function lienSur(href: unknown): string | null {
  if (typeof href !== "string") return null;
  return /^(https?:|mailto:|\/)/i.test(href) ? href : null;
}

function appliquerMarques(contenu: React.ReactNode, marques: TiptapMark[] = []) {
  return marques.reduce<React.ReactNode>((acc, m) => {
    switch (m.type) {
      case "bold":
        return <strong>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "strike":
        return <s>{acc}</s>;
      case "underline":
        return <u>{acc}</u>;
      case "code":
        return <code className="rounded bg-fond-2 px-1 font-mono text-[0.9em]">{acc}</code>;
      case "link": {
        const href = lienSur(m.attrs?.href);
        if (!href) return acc;
        const externe = /^https?:/i.test(href);
        return (
          <a href={href} target={externe ? "_blank" : undefined} rel={externe ? "noopener nofollow" : undefined}>
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, contenu);
}

function idVideo(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { type: "youtube" as const, id: yt[1] };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: "vimeo" as const, id: vimeo[1] };
  return null;
}

export function LecteurVideo({ url, titre }: { url: string; titre: string }) {
  const v = idVideo(url);
  if (v) {
    const src = v.type === "youtube" ? `https://www.youtube-nocookie.com/embed/${v.id}` : `https://player.vimeo.com/video/${v.id}`;
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-noir">
        <iframe
          src={src}
          title={titre}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      </div>
    );
  }
  if (lienSur(url)) {
    return <video src={url} controls preload="metadata" className="aspect-video w-full bg-noir" aria-label={titre} />;
  }
  return null;
}

function Noeud({ n }: { n: TiptapNode }): React.ReactNode {
  const enfants = n.content?.map((c, i) => <Noeud key={i} n={c} />);
  switch (n.type) {
    case "doc":
      return <>{enfants}</>;
    case "text":
      return appliquerMarques(n.text ?? "", n.marks);
    case "paragraph":
      return enfants?.length ? <p>{enfants}</p> : null;
    case "heading": {
      const id = slugify(texteBrut(n));
      return Number(n.attrs?.level) === 3 ? <h3 id={id}>{enfants}</h3> : <h2 id={id}>{enfants}</h2>;
    }
    case "blockquote":
      return <blockquote>{enfants}</blockquote>;
    case "bulletList":
      return <ul>{enfants}</ul>;
    case "orderedList":
      return <ol start={Number(n.attrs?.start ?? 1)}>{enfants}</ol>;
    case "listItem":
      return <li>{enfants}</li>;
    case "hardBreak":
      return <br />;
    case "horizontalRule":
      return <hr />;
    case "codeBlock":
      return (
        <pre className="overflow-x-auto rounded bg-noir p-4 font-mono text-sm text-white">
          <code>{enfants}</code>
        </pre>
      );
    case "image": {
      const src = lienSur(n.attrs?.src);
      if (!src) return null;
      const alt = String(n.attrs?.alt ?? "");
      const legende = n.attrs?.title ? String(n.attrs.title) : null;
      return (
        <figure>
          <Image src={src} alt={alt} width={1200} height={800} sizes="(min-width: 768px) 720px, 100vw" className="h-auto w-full" />
          {legende && <figcaption className="mt-2 text-center font-sans text-sm text-texte-doux">{legende}</figcaption>}
        </figure>
      );
    }
    case "youtube":
    case "video": {
      const src = typeof n.attrs?.src === "string" ? n.attrs.src : null;
      return src ? <LecteurVideo url={src} titre="Vidéo intégrée" /> : null;
    }
    default:
      return enfants ? <Fragment>{enfants}</Fragment> : null;
  }
}

export function TexteRiche({ doc }: { doc: TiptapDoc }) {
  return (
    <div className="corps-article">
      <Noeud n={doc as unknown as TiptapNode} />
    </div>
  );
}
