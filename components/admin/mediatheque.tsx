"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Upload, Video, X } from "lucide-react";
import { classesBouton, classesChamp } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

export type MediaLeger = { id: string; url: string; type: "IMAGE" | "VIDEO" | "PDF"; texteAlternatif: string; legende: string | null };

/** Formulaire de téléversement (texte alternatif obligatoire pour les images). */
export function Televersement({ onTermine, accept = "image/*,video/mp4,video/webm,application/pdf" }: { onTermine: (m: MediaLeger) => void; accept?: string }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [legende, setLegende] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const envoyer = async () => {
    if (!fichier) return;
    setEnCours(true);
    setErreur(null);
    const fd = new FormData();
    fd.set("fichier", fichier);
    fd.set("texteAlternatif", alt);
    fd.set("legende", legende);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setEnCours(false);
    if (!res.ok) {
      setErreur(data.erreur ?? "Échec du téléversement.");
      return;
    }
    onTermine(data.media);
    setFichier(null);
    setAlt("");
    setLegende("");
    if (input.current) input.current.value = "";
  };

  return (
    <div className="space-y-3 border border-dashed border-ligne bg-fond-2 p-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <Upload className="size-4 text-or-fonce" aria-hidden />
        <span>{fichier ? fichier.name : "Choisir un fichier (image, vidéo MP4, PDF — 25 Mo max.)"}</span>
        <input ref={input} type="file" accept={accept} className="sr-only" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
      </label>
      {fichier && (
        <>
          <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Texte alternatif (décrire l'image) *" className={classesChamp} aria-label="Texte alternatif" />
          <input value={legende} onChange={(e) => setLegende(e.target.value)} placeholder="Légende / crédit photo (facultatif)" className={classesChamp} aria-label="Légende" />
          <button type="button" onClick={envoyer} disabled={enCours} className={classesBouton.principal}>
            {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />} Téléverser
          </button>
        </>
      )}
      {erreur && <p className="text-sm font-medium text-danger">{erreur}</p>}
    </div>
  );
}

function Vignette({ m }: { m: MediaLeger }) {
  if (m.type === "IMAGE") return <Image src={m.url} alt={m.texteAlternatif} fill sizes="160px" className="object-cover" />;
  const Icone = m.type === "VIDEO" ? Video : FileText;
  return (
    <div className="grid size-full place-items-center bg-noir text-or">
      <Icone className="size-8" aria-hidden />
    </div>
  );
}

/** Fenêtre de sélection dans la bibliothèque partagée. */
export function SelecteurMedia({
  medias,
  type = "IMAGE",
  onChoisir,
  libelle = "Bibliothèque",
}: {
  medias: MediaLeger[];
  type?: "IMAGE" | "VIDEO" | "PDF";
  onChoisir: (m: MediaLeger) => void;
  libelle?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [liste, setListe] = useState(medias);
  const filtres = liste.filter((m) => m.type === type);
  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className={classesBouton.secondaire}>
        <ImagePlus className="size-4" aria-hidden /> {libelle}
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal aria-label="Bibliothèque de médias">
          <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col bg-fond">
            <div className="flex items-center justify-between border-b border-ligne px-5 py-3">
              <h2 className="font-titre text-lg uppercase">Bibliothèque de médias</h2>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer">
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <Televersement
                accept={type === "IMAGE" ? "image/*" : type === "VIDEO" ? "video/mp4,video/webm" : "application/pdf"}
                onTermine={(m) => {
                  setListe((l) => [m, ...l]);
                  onChoisir(m);
                  setOuvert(false);
                }}
              />
              {filtres.length === 0 ? (
                <p className="py-8 text-center text-sm text-texte-doux">Aucun média de ce type pour l&apos;instant.</p>
              ) : (
                <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {filtres.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChoisir(m);
                          setOuvert(false);
                        }}
                        className={cn("group block w-full text-left")}
                      >
                        <div className="relative aspect-square overflow-hidden border-2 border-transparent group-hover:border-or">
                          <Vignette m={m} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-texte-doux">{m.texteAlternatif}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
