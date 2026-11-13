"use client";
// Formulaires d'administration de la Veille Média (sources et catégories).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useFormulaire } from "@/lib/hooks";
import { enregistrerCategorieVeille, enregistrerSourceVeille } from "@/lib/actions/veille";
import { classesBouton, classesChamp, Message } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

export type SourceFormulaire = {
  id: string;
  nom: string;
  url: string;
  siteUrl: string | null;
  langue: string;
  zoneParDefaut: string | null;
  categorieParDefaut: string | null;
  filtrerTech: boolean;
  actif: boolean;
};

function Champ({ label, aide, children }: { label: string; aide?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {aide && <span className="mt-1 block text-xs text-texte-doux">{aide}</span>}
    </label>
  );
}

export function FormulaireSource({
  source,
  zones,
  categories,
  onFini,
}: {
  source?: SourceFormulaire;
  zones: { cle: string; nom: string }[];
  categories: { slug: string; nom: string }[];
  onFini?: () => void;
}) {
  const router = useRouter();
  const { etat, onSubmit, enCours, ref } = useFormulaire(enregistrerSourceVeille, {
    viderSiSucces: !source,
    apresSucces: () => {
      router.refresh();
      onFini?.();
    },
  });
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      {source && <input type="hidden" name="id" value={source.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Champ label="Nom du média">
          <input name="nom" required defaultValue={source?.nom} maxLength={80} className={classesChamp} />
        </Champ>
        <Champ label="Adresse du flux RSS / Atom" aide="Flux d'un média, ou flux d'une alerte Google (option « Flux RSS » dans Google Alerts). Le flux est vérifié à l'enregistrement.">
          <input name="url" type="url" required defaultValue={source?.url} placeholder="https://…/feed/" className={classesChamp} />
        </Champ>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Champ label="Site (facultatif)">
          <input name="siteUrl" type="url" defaultValue={source?.siteUrl ?? ""} className={classesChamp} />
        </Champ>
        <Champ label="Langue">
          <select name="langue" defaultValue={source?.langue ?? "fr"} className={classesChamp}>
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </Champ>
        <Champ label="Zone par défaut" aide="Si aucun pays n'est reconnu.">
          <select name="zoneParDefaut" defaultValue={source?.zoneParDefaut ?? ""} className={classesChamp}>
            <option value="">Aucune (Non précisé)</option>
            {zones.map((z) => (
              <option key={z.cle} value={z.cle}>{z.nom}</option>
            ))}
          </select>
        </Champ>
        <Champ label="Catégorie par défaut" aide="Si aucun mot-clé n'est reconnu.">
          <select name="categorieParDefaut" defaultValue={source?.categorieParDefaut ?? ""} className={classesChamp}>
            <option value="">Aucune</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.nom}</option>
            ))}
          </select>
        </Champ>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="filtrerTech" defaultChecked={source?.filtrerTech ?? false} /> Média généraliste : ne garder que les actualités technologiques
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="actif" defaultChecked={source?.actif ?? true} /> Active
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={enCours} className={classesBouton.principal}>
          {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : !source && <Plus className="size-4" aria-hidden />}
          {source ? "Enregistrer" : "Ajouter la source"}
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

export function EditionSource(props: { source: SourceFormulaire; zones: { cle: string; nom: string }[]; categories: { slug: string; nom: string }[] }) {
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert)
    return (
      <button type="button" onClick={() => setOuvert(true)} className={cn(classesBouton.secondaire, "h-8 px-2")} title="Modifier" aria-label={`Modifier ${props.source.nom}`}>
        <Pencil className="size-4" />
      </button>
    );
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal aria-label={`Modifier ${props.source.nom}`}>
      <div className="w-full max-w-3xl bg-fond p-6 shadow-2xl">
        <h2 className="mb-4 font-titre text-xl uppercase">Modifier la source</h2>
        <FormulaireSource {...props} onFini={() => setOuvert(false)} />
      </div>
    </div>
  );
}

export function FormulaireCategorie({
  categorie,
  onFini,
}: {
  categorie?: { id: string; nom: string; nomEn: string; motsCles: string[]; ordre: number };
  onFini?: () => void;
}) {
  const router = useRouter();
  const { etat, onSubmit, enCours, ref } = useFormulaire(enregistrerCategorieVeille, {
    viderSiSucces: !categorie,
    apresSucces: () => {
      router.refresh();
      onFini?.();
    },
  });
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      {categorie && <input type="hidden" name="id" value={categorie.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px]">
        <Champ label="Nom">
          <input name="nom" required defaultValue={categorie?.nom} maxLength={60} className={classesChamp} />
        </Champ>
        <Champ label="Nom en anglais">
          <input name="nomEn" required defaultValue={categorie?.nomEn} maxLength={60} className={classesChamp} />
        </Champ>
        <Champ label="Ordre">
          <input name="ordre" type="number" min={0} max={99} defaultValue={categorie?.ordre ?? 20} className={classesChamp} />
        </Champ>
      </div>
      <Champ label="Mots-clés de classement" aide="Séparés par des virgules, en français et en anglais (accents et majuscules ignorés). Préfixe « = » pour un sigle en majuscules exactes, ex. « =IA ».">
        <textarea name="motsCles" defaultValue={categorie?.motsCles.join(", ")} rows={3} className={cn(classesChamp, "h-auto py-2")} />
      </Champ>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={enCours} className={classesBouton.principal}>
          {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : !categorie && <Plus className="size-4" aria-hidden />}
          {categorie ? "Enregistrer" : "Ajouter la catégorie"}
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

export function EditionCategorie({ categorie }: { categorie: { id: string; nom: string; nomEn: string; motsCles: string[]; ordre: number } }) {
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert)
    return (
      <button type="button" onClick={() => setOuvert(true)} className={cn(classesBouton.secondaire, "h-8 px-2")} title="Modifier" aria-label={`Modifier ${categorie.nom}`}>
        <Pencil className="size-4" />
      </button>
    );
  return (
    <div className="w-full py-3">
      <FormulaireCategorie categorie={categorie} onFini={() => setOuvert(false)} />
    </div>
  );
}
