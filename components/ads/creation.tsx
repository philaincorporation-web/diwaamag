"use client";
// Rendu d'une création publicitaire dans son cadre : image (création mobile distincte via <picture>),
// GIF (affiché comme une image) ou vidéo muette lue seulement quand l'encart est visible.

import { getImageProps } from "next/image";
import { useEffect, useRef } from "react";
import { imageOptimisable } from "@/lib/images";
import type { PubliciteAffichee } from "@/lib/data";
import { SOURCES, TAILLES, type FormeEncart } from "@/components/ads/cadres";
import { texteAlt } from "@/components/ads/use-pub";

const VIDEO = /\.(mp4|webm)(\?.*)?$/i;

function VideoPub({ src, titre }: { src: string; titre: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        if (!v.src) v.src = src;
        v.play().catch(() => {});
      } else v.pause();
    }, { threshold: 0.5 });
    obs.observe(v);
    return () => obs.disconnect();
  }, [src]);
  return <video ref={ref} muted loop playsInline preload="none" aria-label={titre} className="size-full object-cover" />;
}

export function Creation({
  pub,
  forme,
  lang,
  prioritaire = false,
  onErreur,
}: {
  pub: PubliciteAffichee;
  forme: FormeEncart;
  lang: "fr" | "en";
  prioritaire?: boolean;
  onErreur?: () => void;
}) {
  const alt = texteAlt(pub, lang);
  if (VIDEO.test(pub.imageUrl)) return <VideoPub src={pub.imageUrl} titre={alt} />;

  const [lo, ha] = SOURCES[forme].desktop;
  const commun = {
    alt,
    sizes: TAILLES[forme],
    loading: prioritaire ? ("eager" as const) : ("lazy" as const),
    fetchPriority: prioritaire ? ("high" as const) : ("auto" as const),
  };
  const { props: principale } = getImageProps({ ...commun, src: pub.imageUrl, width: lo, height: ha, unoptimized: !imageOptimisable(pub.imageUrl) });
  const img = (
    // getImageProps : balise <img> volontaire, pour servir une création distincte sur mobile (direction artistique).
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...principale} onError={onErreur} className="size-full object-cover" />
  );
  if (!pub.imageMobileUrl || VIDEO.test(pub.imageMobileUrl)) return img;

  const [mlo, mha] = SOURCES[forme].mobile;
  const { props: mobile } = getImageProps({ ...commun, src: pub.imageMobileUrl, width: mlo, height: mha, unoptimized: !imageOptimisable(pub.imageMobileUrl) });
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobile.srcSet ?? mobile.src} sizes={commun.sizes} />
      {img}
    </picture>
  );
}
