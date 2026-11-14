"use client";
// Formulaire de campagne publicitaire (création et modification).

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useFormulaire } from "@/lib/hooks";
import { enregistrerPublicite } from "@/lib/actions/publicites";
import { SelecteurMedia, type MediaLeger } from "@/components/admin/mediatheque";
import { classesBouton, classesChamp, Message } from "@/components/admin/ui";
import { imageOptimisable } from "@/lib/images";
import { cn } from "@/lib/cn";
import { EMPLACEMENTS_PUB, LANGUES_PUB, type CleEmplacement, type CleLanguePub } from "@/lib/publicite-emplacements";

export type PubliciteFormulaire = {
  id: string;
  nom: string;
  annonceur: string;
  emplacement: CleEmplacement;
  imageUrl: string;
  imageAlt: string;
  imageMobileUrl: string;
  imageAltEn: string;
  langue: CleLanguePub;
  lien: string;
  debut: string; // AAAA-MM-JJ
  fin: string;
  poids: number;
  actif: boolean;
};

function Champ({ label, aide, children, requis }: { label: string; aide?: string; children: React.ReactNode; requis?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">
        {label} {requis && <span className="text-danger" aria-hidden>*</span>}
      </span>
      {children}
      {aide && <span className="mt-1 block text-xs text-texte-doux">{aide}</span>}
    </label>
  );
}

export function FormulairePublicite({ pub, medias, onFini }: { pub?: PubliciteFormulaire; medias: MediaLeger[]; onFini?: () => void }) {
  const router = useRouter();
  const [emplacement, setEmplacement] = useState<CleEmplacement>(pub?.emplacement ?? "HAUT_PAGE");
  const [imageUrl, setImageUrl] = useState(pub?.imageUrl ?? "");
  const [imageAlt, setImageAlt] = useState(pub?.imageAlt ?? "");
  const [imageMobileUrl, setImageMobileUrl] = useState(pub?.imageMobileUrl ?? "");
  const { etat, onSubmit, enCours, ref } = useFormulaire(enregistrerPublicite, {
    viderSiSucces: !pub,
    apresSucces: () => {
      if (!pub) {
        setImageUrl("");
        setImageAlt("");
        setImageMobileUrl("");
      }
      router.refresh();
      onFini?.();
    },
  });

  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className="space-y-4"
    >
      {pub && <input type="hidden" name="id" value={pub.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label="Nom de la campagne" requis aide="Usage interne, ex. « BGFIBank — rentrée 2026 ».">
          <input name="nom" required defaultValue={pub?.nom} maxLength={120} className={classesChamp} />
        </Champ>
        <Champ label="Annonceur" requis>
          <input name="annonceur" required defaultValue={pub?.annonceur} maxLength={120} className={classesChamp} />
        </Champ>
      </div>
      <Champ label="Emplacement" requis aide={`Format conseillé : ${EMPLACEMENTS_PUB[emplacement].format}.`}>
        <select name="emplacement" value={emplacement} onChange={(e) => setEmplacement(e.target.value as CleEmplacement)} className={classesChamp}>
          {Object.entries(EMPLACEMENTS_PUB).map(([cle, e]) => (
            <option key={cle} value={cle}>{e.libelle}</option>
          ))}
        </select>
      </Champ>

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div className="space-y-3">
          <Champ label="Image" requis aide="Choisissez ou envoyez l'image dans la médiathèque, ou collez son adresse.">
            <div className="flex gap-2">
              <input name="imageUrl" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={classesChamp} placeholder="https://res.cloudinary.com/…" />
              <SelecteurMedia
                medias={medias}
                libelle="Médiathèque"
                onChoisir={(m) => {
                  setImageUrl(m.url);
                  if (!imageAlt) setImageAlt(m.texteAlternatif);
                }}
              />
            </div>
          </Champ>
          <Champ label="Texte alternatif (français)" requis aide="Ce que dit la bannière, pour les lecteurs d'écran.">
            <input name="imageAlt" required value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} maxLength={200} className={classesChamp} />
          </Champ>
          <Champ label="Texte alternatif (anglais)" aide="Pour la version /en du site. Vide = texte français.">
            <input name="imageAltEn" defaultValue={pub?.imageAltEn} maxLength={200} className={classesChamp} />
          </Champ>
        </div>
        <div className="grid place-items-center border border-dashed border-ligne bg-fond-2 p-2">
          {imageUrl && /^(https:\/\/|\/)/.test(imageUrl) ? (
            <Image src={imageUrl} unoptimized={!imageOptimisable(imageUrl)} alt="" width={400} height={200} className="h-auto max-h-40 w-full object-contain" />
          ) : (
            <span className="text-xs text-texte-doux">Aperçu</span>
          )}
        </div>
      </div>

      {EMPLACEMENTS_PUB[emplacement].mobile ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Champ label="Image mobile (recommandée)" aide="640 × 200 px, affichée sur téléphone (320 × 100). Vide = image principale recadrée.">
            <div className="flex gap-2">
              <input name="imageMobileUrl" value={imageMobileUrl} onChange={(e) => setImageMobileUrl(e.target.value)} className={classesChamp} placeholder="https://res.cloudinary.com/…" />
              <SelecteurMedia medias={medias} libelle="Médiathèque" onChoisir={(m) => setImageMobileUrl(m.url)} />
            </div>
          </Champ>
          <div className="grid place-items-center border border-dashed border-ligne bg-fond-2 p-2">
            {imageMobileUrl && /^(https:\/\/|\/)/.test(imageMobileUrl) ? (
              <Image src={imageMobileUrl} unoptimized={!imageOptimisable(imageMobileUrl)} alt="" width={320} height={100} className="h-auto max-h-24 w-full object-contain" />
            ) : (
              <span className="text-xs text-texte-doux">Aperçu mobile</span>
            )}
          </div>
        </div>
      ) : (
        <input type="hidden" name="imageMobileUrl" value="" />
      )}

      <Champ label="Langue de diffusion" aide="Une campagne en anglais peut n'être montrée que sur la version /en.">
        <select name="langue" defaultValue={pub?.langue ?? "TOUTES"} className={classesChamp}>
          {Object.entries(LANGUES_PUB).map(([cle, libelle]) => (
            <option key={cle} value={cle}>{libelle}</option>
          ))}
        </select>
      </Champ>

      <Champ label="Lien de destination" requis aide="Page de l'annonceur ouverte au clic (les clics sont comptés).">
        <input name="lien" type="url" required defaultValue={pub?.lien} placeholder="https://…" className={classesChamp} />
      </Champ>
      <div className="grid gap-4 sm:grid-cols-4">
        <Champ label="Début" aide="Vide = immédiatement.">
          <input name="debut" type="date" defaultValue={pub?.debut} className={classesChamp} />
        </Champ>
        <Champ label="Fin" aide="Vide = sans fin.">
          <input name="fin" type="date" defaultValue={pub?.fin} className={classesChamp} />
        </Champ>
        <Champ label="Poids de rotation" aide="2 = affichée deux fois plus souvent.">
          <input name="poids" type="number" min={1} max={10} defaultValue={pub?.poids ?? 1} className={classesChamp} />
        </Champ>
        <label className="flex items-center gap-2 self-center pt-5 text-sm font-semibold">
          <input name="actif" type="checkbox" defaultChecked={pub?.actif ?? true} /> Active
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={enCours} className={classesBouton.principal}>
          {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : pub ? null : <Plus className="size-4" aria-hidden />}
          {pub ? "Enregistrer" : "Créer la campagne"}
        </button>
        {onFini && (
          <button type="button" onClick={onFini} className={classesBouton.lien}>
            Annuler
          </button>
        )}
        <Message etat={etat} />
      </div>
    </form>
  );
}

/** Bouton « Modifier » qui déplie le formulaire d'une campagne existante. */
export function EditionPublicite({ pub, medias }: { pub: PubliciteFormulaire; medias: MediaLeger[] }) {
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className={cn(classesBouton.secondaire, "h-8 px-2")} title="Modifier" aria-label={`Modifier ${pub.nom}`}>
        <Pencil className="size-4" />
      </button>
    );
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal aria-label={`Modifier ${pub.nom}`}>
      <div className="w-full max-w-3xl bg-fond p-6 shadow-2xl">
        <h2 className="mb-4 font-titre text-xl uppercase">Modifier la campagne</h2>
        <FormulairePublicite pub={pub} medias={medias} onFini={() => setOuvert(false)} />
      </div>
    </div>
  );
}
