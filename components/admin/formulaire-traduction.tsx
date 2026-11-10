"use client";

import { useState, useTransition } from "react";
import { Languages, Loader2, Save, Sparkles } from "lucide-react";
import { enregistrerTraduction, proposerTraductionAuto } from "@/lib/actions/traductions";
import { useFormulaire } from "@/lib/hooks";
import type { TiptapDoc } from "@/lib/content";
import { EditeurRiche } from "@/components/admin/editeur-riche";
import type { MediaLeger } from "@/components/admin/mediatheque";
import { classesBouton, classesChamp } from "@/components/admin/styles";
import { Message } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

export function FormulaireTraduction({
  articleId,
  initial,
  medias,
  autoDisponible,
}: {
  articleId: string;
  initial: { titre: string; chapeau: string; contenu: TiptapDoc; relue: boolean };
  medias: MediaLeger[];
  autoDisponible: boolean;
}) {
  const [titre, setTitre] = useState(initial.titre);
  const [chapeau, setChapeau] = useState(initial.chapeau);
  const [contenu, setContenu] = useState<TiptapDoc>(initial.contenu);
  const [relue, setRelue] = useState(initial.relue);
  const [versionEditeur, setVersionEditeur] = useState(0);
  const [infoAuto, setInfoAuto] = useState<{ ok: boolean; message: string } | null>(null);
  const [traductionEnCours, demarrer] = useTransition();
  const { etat, onSubmit, enCours } = useFormulaire(enregistrerTraduction);
  const e = etat?.erreurs ?? {};

  const traduireAuto = () =>
    demarrer(async () => {
      const r = await proposerTraductionAuto(articleId);
      setInfoAuto({ ok: r.ok, message: r.message });
      if (r.ok) {
        setTitre(r.titre);
        setChapeau(r.chapeau);
        setContenu(r.contenu);
        setRelue(false);
        setVersionEditeur((v) => v + 1); // recharge l'éditeur avec le texte traduit
      }
    });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="contenu" value={JSON.stringify(contenu)} />
      <Message etat={etat} />
      <Message etat={infoAuto} />

      <div className="flex flex-wrap items-center gap-3 border border-ligne bg-fond p-4">
        <Languages className="size-5 text-or-fonce" aria-hidden />
        <p className="flex-1 text-sm text-texte-doux">
          {autoDisponible
            ? "Partez d'une traduction automatique (DeepL) de la version française enregistrée, puis relisez-la."
            : "Traduction automatique non configurée : renseignez DEEPL_API_KEY pour l'activer. Vous pouvez saisir la traduction à la main."}
        </p>
        <button type="button" onClick={traduireAuto} disabled={!autoDisponible || traductionEnCours} className={classesBouton.secondaire}>
          {traductionEnCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          Traduire automatiquement
        </button>
      </div>

      <div>
        <label htmlFor="titre-en" className="mb-1 block text-sm font-semibold">Title (English) <span className="text-danger" aria-hidden>*</span></label>
        <input id="titre-en" name="titre" lang="en" value={titre} onChange={(ev) => setTitre(ev.target.value)} className={cn(classesChamp, "h-auto py-3 font-titre text-2xl uppercase")} />
        {e.titre && <p className="mt-1 text-xs font-medium text-danger">{e.titre}</p>}
      </div>
      <div>
        <label htmlFor="chapeau-en" className="mb-1 block text-sm font-semibold">Standfirst (English) <span className="text-danger" aria-hidden>*</span></label>
        <textarea id="chapeau-en" name="chapeau" lang="en" rows={3} value={chapeau} onChange={(ev) => setChapeau(ev.target.value)} className={cn(classesChamp, "h-auto py-2 font-serif text-base")} />
        {e.chapeau && <p className="mt-1 text-xs font-medium text-danger">{e.chapeau}</p>}
      </div>
      <div lang="en">
        <p className="mb-1 text-sm font-semibold">Body (English)</p>
        <EditeurRiche key={versionEditeur} initial={contenu} medias={medias} onChange={setContenu} />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="relue" checked={relue} onChange={(ev) => setRelue(ev.target.checked)} className="size-4 accent-[var(--or)]" />
        Traduction relue par la rédaction (sinon, le site indique aux lecteurs qu&apos;il s&apos;agit d&apos;une traduction automatique)
      </label>
      <button disabled={enCours} className={classesBouton.or}>
        {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />} Enregistrer la version anglaise
      </button>
    </form>
  );
}
