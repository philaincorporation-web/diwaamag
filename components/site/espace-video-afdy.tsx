"use client";
// Espace vidéo de l'accueil : AFDY, l'avatar des DigieWomen Awards, invite à regarder sa vidéo
// « Comment voter » (clic sur l'avatar ou sur le bouton : la vidéo défile à l'écran et démarre),
// suivie de la vidéo de présentation de l'événement.
// Les vidéos ne se chargent qu'au clic (preload="none" + image d'aperçu) : la page reste légère.

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLangue } from "@/components/i18n/contexte";

const SITE_VOTE = "https://www.digiewomenawards.com";

type CleVideo = "vote" | "evenement";
const VIDEOS: Record<CleVideo, { src: string; poster: string; largeur: number; hauteur: number }> = {
  vote: { src: "/videos/afdy-comment-voter.mp4", poster: "/videos/afdy-comment-voter.jpg", largeur: 848, hauteur: 480 },
  evenement: { src: "/videos/diwaa-2026-presentation.mp4", poster: "/videos/diwaa-2026-presentation.jpg", largeur: 1280, hauteur: 720 },
};

function LecteurVideo({
  cle,
  titre,
  info,
  lancee,
  onLancer,
  vedette = false,
}: {
  cle: CleVideo;
  titre: string;
  info: string;
  lancee: boolean;
  onLancer: () => void;
  vedette?: boolean;
}) {
  const { t } = useLangue();
  const v = VIDEOS[cle];
  return (
    <figure id={`video-${cle}`} className="scroll-mt-24">
      <div className={cn("relative aspect-video overflow-hidden bg-noir ring-1", vedette ? "ring-or/60" : "ring-white/10")}>
        {lancee ? (
          <video src={v.src} poster={v.poster} controls autoPlay playsInline preload="auto" aria-label={titre} className="size-full bg-noir object-contain" />
        ) : (
          <button type="button" onClick={onLancer} aria-label={`${t.lireVideo} : ${titre}`} className="group/video relative block size-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-or">
            <Image src={v.poster} alt="" width={v.largeur} height={v.hauteur} sizes="(min-width: 1024px) 700px, 100vw" className="size-full object-cover transition duration-500 motion-safe:group-hover/video:scale-[1.03]" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-noir/70 via-transparent to-transparent" />
            <span
              aria-hidden
              className={cn(
                "absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-or text-noir shadow-xl transition duration-300 group-hover/video:bg-white motion-safe:group-hover/video:scale-110",
                vedette ? "size-20" : "size-16",
              )}
            >
              <Play className={cn("translate-x-0.5 fill-current", vedette ? "size-8" : "size-6")} />
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3">
        <span className={cn("block font-titre uppercase leading-tight", vedette ? "text-xl" : "text-lg")}>{titre}</span>
        <span className="mt-1 block text-sm text-white/60">
          {info}
          {t.videoEnFrancais && ` · ${t.videoEnFrancais}`}
        </span>
      </figcaption>
    </figure>
  );
}

export function EspaceVideoAfdy() {
  const { t } = useLangue();
  const [lancees, setLancees] = useState<CleVideo[]>([]);
  const refVote = useRef<HTMLDivElement>(null);
  const lancer = (cle: CleVideo) => setLancees((l) => (l.includes(cle) ? l : [...l, cle]));

  /** Invitation d'AFDY : amène la vidéo « Comment voter » à l'écran et la démarre. */
  function regarderVote() {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    refVote.current?.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "center" });
    lancer("vote");
  }

  return (
    <div className="space-y-10">
      <div className="group grid items-center gap-8 border border-white/10 bg-white/5 p-6 sm:p-8 md:grid-cols-[auto_1fr]">
        {/* Avatar cliquable : au survol, il s'élève, le halo doré s'élargit et une bulle « Bonjour » apparaît */}
        <button
          type="button"
          onClick={regarderVote}
          aria-label={t.afdyClicAvatar}
          className="relative mx-auto block aspect-[640/1020] w-44 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-or sm:w-52 md:mx-0"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-[22%] mx-auto aspect-square w-[88%] rounded-full bg-or/85 transition duration-500 ease-out group-hover:bg-or group-hover:shadow-[0_0_70px_12px_rgba(205,164,14,0.45)] motion-safe:group-hover:scale-110"
          />
          <span
            aria-hidden
            className="absolute inset-x-0 top-[22%] mx-auto aspect-square w-[88%] animate-ping rounded-full border-2 border-or opacity-30 [animation-duration:2.5s] motion-reduce:animate-none"
          />
          <Image
            src="/images/afdy-avatar.webp"
            alt={t.avatarAfdy}
            fill
            sizes="(min-width: 640px) 208px, 176px"
            className="object-contain object-bottom drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)] transition duration-500 ease-out [mask-image:linear-gradient(to_bottom,black_82%,transparent)] motion-safe:group-hover:-translate-y-2 motion-safe:group-hover:scale-[1.04]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -top-4 left-[64%] whitespace-nowrap rounded-2xl rounded-bl-none bg-white px-3 py-1.5 text-xs font-bold text-noir opacity-0 shadow-lg transition duration-300 group-hover:opacity-100 motion-safe:translate-y-1 motion-safe:group-hover:translate-y-0"
          >
            {t.bonjourAfdy}
          </span>
        </button>

        <div>
          <p className="font-titre text-sm uppercase tracking-[0.3em] text-or">{t.afdyGuide}</p>
          <h3 className="mt-2 font-titre text-3xl uppercase leading-tight">{t.videoVoteTitre}</h3>
          <p className="mt-3 max-w-2xl text-lg text-white/80">{t.afdyInvite}</p>
          <p className="mt-3 text-sm font-semibold text-or">{t.afdyVotesOuverts}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={regarderVote}
              className="inline-flex items-center gap-2 bg-or px-5 py-3 text-sm font-bold uppercase tracking-wide text-noir transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-or"
            >
              <Play className="size-4 fill-current" aria-hidden /> {t.afdyRegarder}
            </button>
            <a
              href={SITE_VOTE}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 border border-white/30 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:border-or hover:text-or focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-or"
            >
              {t.afdyVoter} <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div ref={refVote}>
          <LecteurVideo cle="vote" titre={t.videoVoteTitre} info={t.videoVoteInfo} lancee={lancees.includes("vote")} onLancer={() => lancer("vote")} vedette />
        </div>
        <LecteurVideo cle="evenement" titre={t.videoEvenementTitre} info={t.videoEvenementInfo} lancee={lancees.includes("evenement")} onLancer={() => lancer("evenement")} />
      </div>
    </div>
  );
}
