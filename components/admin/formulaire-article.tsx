"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useFormulaire, useMonte } from "@/lib/hooks";
import { CalendarClock, Eye, Loader2, Save, Send, Star } from "lucide-react";
import { enregistrerArticle } from "@/lib/actions/articles";
import { slugify, type TiptapDoc } from "@/lib/content";
import { EditeurRiche } from "@/components/admin/editeur-riche";
import { SelecteurMedia, type MediaLeger } from "@/components/admin/mediatheque";
import { classesBouton, classesChamp, Message } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

export type ArticleFormulaire = {
  id?: string;
  titre: string;
  slug: string;
  chapeau: string;
  contenu: TiptapDoc;
  rubriqueId: string;
  type: "ACTUALITE" | "INTERVIEW" | "DOSSIER" | "VIDEO";
  motsCles: string;
  imageUneUrl: string;
  imageUneAlt: string;
  videoUrl: string;
  aLaUne: boolean;
  metaTitre: string;
  metaDescription: string;
  dateProgrammee: string;
  statut: string;
};

function Libelle({ htmlFor, children, requis }: { htmlFor: string; children: React.ReactNode; requis?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold">
      {children} {requis && <span className="text-danger" aria-hidden>*</span>}
    </label>
  );
}

/** Saisie en heure locale du navigateur, transmise au serveur en ISO (UTC) pour éviter tout décalage de fuseau. */
function versHeureLocale(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function ChampDateLocale(props: { id: string; name: string; iso: string }) {
  // Le fuseau du navigateur n'est connu qu'après hydratation.
  const monte = useMonte();
  if (!monte) return <input id={props.id} type="datetime-local" disabled className={classesChamp} />;
  return <ChampDateLocaleClient {...props} />;
}

function ChampDateLocaleClient({ id, name, iso }: { id: string; name: string; iso: string }) {
  const [local, setLocal] = useState(() => versHeureLocale(iso));
  const valeurIso = local ? new Date(local).toISOString() : "";
  return (
    <>
      <input id={id} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className={classesChamp} />
      <input type="hidden" name={name} value={valeurIso} />
    </>
  );
}

function Erreur({ texte }: { texte?: string }) {
  return texte ? <p className="mt-1 text-xs font-medium text-danger">{texte}</p> : null;
}

export function FormulaireArticle({
  article,
  rubriques,
  medias,
  motsClesExistants,
}: {
  article: ArticleFormulaire;
  rubriques: { id: string; nom: string; famille: string }[];
  medias: MediaLeger[];
  motsClesExistants: string[];
}) {
  const [modifie, setModifie] = useState(false);
  const { etat, onSubmit, enCours } = useFormulaire(enregistrerArticle, { apresSucces: () => setModifie(false) });
  const [contenu, setContenu] = useState<TiptapDoc>(article.contenu);
  const [titre, setTitre] = useState(article.titre);
  // Le slug suit le titre tant qu'il n'a pas été modifié à la main (toujours figé pour un article existant).
  const [slugManuel, setSlugManuel] = useState<string | null>(article.id ? article.slug : null);
  const slug = slugManuel ?? slugify(titre);
  const [image, setImage] = useState({ url: article.imageUneUrl, alt: article.imageUneAlt });
  const [chapeau, setChapeau] = useState(article.chapeau);
  const [type, setType] = useState(article.type);
  const e = etat?.erreurs ?? {};

  // Avertit avant de quitter la page avec des modifications non enregistrées.
  useEffect(() => {
    if (!modifie) return;
    const avant = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, [modifie]);

  const publie = article.statut === "PUBLIE";

  return (
    <form onSubmit={onSubmit} onChange={() => setModifie(true)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <input type="hidden" name="id" value={article.id ?? ""} />
      <input type="hidden" name="contenu" value={JSON.stringify(contenu)} />
      <input type="hidden" name="imageUneUrl" value={image.url} />

      <div className="min-w-0 space-y-5">
        <Message etat={etat} />
        <div>
          <Libelle htmlFor="titre" requis>Titre</Libelle>
          <input
            id="titre"
            name="titre"
            value={titre}
            onChange={(ev) => setTitre(ev.target.value)}
            required
            className={cn(classesChamp, "h-auto py-3 font-titre text-2xl uppercase")}
            placeholder="Titre de l'article"
          />
          <Erreur texte={e.titre} />
          <div className="mt-2 flex items-center gap-2 text-xs text-texte-doux">
            <span>/article/</span>
            <input
              name="slug"
              value={slug}
              onChange={(ev) => setSlugManuel(slugify(ev.target.value))}
              aria-label="Adresse (slug)"
              className="min-w-0 flex-1 border-b border-dashed border-ligne bg-transparent py-1 outline-none focus:border-or"
            />
          </div>
        </div>
        <div>
          <Libelle htmlFor="chapeau" requis>Chapeau</Libelle>
          <textarea
            id="chapeau"
            name="chapeau"
            rows={3}
            value={chapeau}
            onChange={(ev) => setChapeau(ev.target.value)}
            className={cn(classesChamp, "h-auto py-2 font-serif text-base")}
            placeholder="Le résumé accrocheur affiché sous le titre et sur les cartes."
          />
          <p className="mt-1 text-right text-xs text-texte-doux">{chapeau.length} / 600</p>
          <Erreur texte={e.chapeau} />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Contenu <span className="text-danger" aria-hidden>*</span></p>
          <EditeurRiche
            initial={article.contenu}
            medias={medias}
            onChange={(doc) => {
              setContenu(doc);
              setModifie(true);
            }}
          />
          <Erreur texte={e.contenu} />
        </div>
        <details className="border border-ligne bg-fond p-4">
          <summary className="cursor-pointer text-sm font-semibold">Référencement (SEO)</summary>
          <div className="mt-4 space-y-4">
            <div>
              <Libelle htmlFor="metaTitre">Titre pour les moteurs de recherche</Libelle>
              <input id="metaTitre" name="metaTitre" defaultValue={article.metaTitre} maxLength={70} className={classesChamp} placeholder="Par défaut : le titre" />
              <Erreur texte={e.metaTitre} />
            </div>
            <div>
              <Libelle htmlFor="metaDescription">Description</Libelle>
              <textarea id="metaDescription" name="metaDescription" defaultValue={article.metaDescription} maxLength={160} rows={2} className={cn(classesChamp, "h-auto py-2")} placeholder="Par défaut : le chapeau" />
              <Erreur texte={e.metaDescription} />
            </div>
          </div>
        </details>
      </div>

      <aside className="space-y-5">
        <div className="space-y-3 border border-ligne bg-fond p-4">
          <p className="font-titre text-sm uppercase tracking-[0.14em]">Publication</p>
          <div className="grid gap-2">
            <button name="intention" value="publier" disabled={enCours} className={classesBouton.or}>
              {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              {publie ? "Mettre à jour en ligne" : "Publier maintenant"}
            </button>
            {!publie && (
              <button name="intention" value="brouillon" disabled={enCours} className={classesBouton.secondaire}>
                <Save className="size-4" aria-hidden /> Enregistrer le brouillon
              </button>
            )}
            {article.id && (
              <a href={`/admin/articles/${article.id}/apercu`} target="_blank" className={classesBouton.secondaire}>
                <Eye className="size-4" aria-hidden /> Aperçu (version enregistrée)
              </a>
            )}
          </div>
          {!publie && (
            <div className="border-t border-ligne pt-3">
              <Libelle htmlFor="dateProgrammee">Programmer la publication</Libelle>
              <ChampDateLocale id="dateProgrammee" name="dateProgrammee" iso={article.dateProgrammee} />
              <Erreur texte={e.dateProgrammee} />
              <button name="intention" value="programmer" disabled={enCours} className={cn(classesBouton.secondaire, "mt-2 w-full")}>
                <CalendarClock className="size-4" aria-hidden /> Programmer
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 border-t border-ligne pt-3 text-sm font-semibold">
            <input type="checkbox" name="aLaUne" defaultChecked={article.aLaUne} className="size-4 accent-[var(--or)]" />
            <Star className="size-4 text-or-fonce" aria-hidden /> Mettre à la Une (carrousel)
          </label>
        </div>

        <div className="space-y-4 border border-ligne bg-fond p-4">
          <div>
            <Libelle htmlFor="rubriqueId" requis>Rubrique principale</Libelle>
            <select id="rubriqueId" name="rubriqueId" defaultValue={article.rubriqueId} required className={classesChamp}>
              <option value="">— Choisir —</option>
              <optgroup label="Géographiques">
                {rubriques.filter((r) => r.famille === "GEOGRAPHIQUE").map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </optgroup>
              <optgroup label="Thématiques">
                {rubriques.filter((r) => r.famille === "THEMATIQUE").map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </optgroup>
            </select>
            <Erreur texte={e.rubriqueId} />
          </div>
          <div>
            <Libelle htmlFor="type">Type de contenu</Libelle>
            <select id="type" name="type" value={type} onChange={(ev) => setType(ev.target.value as ArticleFormulaire["type"])} className={classesChamp}>
              <option value="ACTUALITE">Article d&apos;actualité</option>
              <option value="INTERVIEW">Interview</option>
              <option value="DOSSIER">Dossier de fond</option>
              <option value="VIDEO">Vidéo</option>
            </select>
          </div>
          {type === "VIDEO" && (
            <div>
              <Libelle htmlFor="videoUrl" requis>URL de la vidéo</Libelle>
              <input id="videoUrl" name="videoUrl" defaultValue={article.videoUrl} placeholder="https://www.youtube.com/watch?v=…" className={classesChamp} />
              <Erreur texte={e.videoUrl} />
            </div>
          )}
          <div>
            <Libelle htmlFor="motsCles">Mots-clés</Libelle>
            <input id="motsCles" name="motsCles" defaultValue={article.motsCles} list="liste-mots-cles" placeholder="IA, Cybersécurité, Gabon Digital" className={classesChamp} />
            <datalist id="liste-mots-cles">
              {motsClesExistants.map((m) => <option key={m} value={m} />)}
            </datalist>
            <p className="mt-1 text-xs text-texte-doux">Séparés par des virgules.</p>
          </div>
        </div>

        <div className="space-y-3 border border-ligne bg-fond p-4">
          <p className="text-sm font-semibold">Image de Une <span className="text-danger" aria-hidden>*</span></p>
          {image.url ? (
            <div className="relative aspect-[16/10] overflow-hidden bg-fond-2">
              <Image src={image.url} alt={image.alt || "Aperçu de l'image de Une"} fill sizes="320px" className="object-cover object-top" />
            </div>
          ) : (
            <div className="grid aspect-[16/10] place-items-center bg-fond-2 text-xs text-texte-doux">Aucune image</div>
          )}
          <div className="flex flex-wrap gap-2">
            <SelecteurMedia
              medias={medias}
              libelle={image.url ? "Changer" : "Choisir"}
              onChoisir={(m) => {
                setImage({ url: m.url, alt: m.texteAlternatif });
                setModifie(true);
              }}
            />
            {image.url && (
              <button type="button" onClick={() => setImage({ url: "", alt: "" })} className={classesBouton.lien}>
                Retirer
              </button>
            )}
          </div>
          <Erreur texte={e.imageUneUrl} />
          <div>
            <Libelle htmlFor="imageUneAlt" requis>Texte alternatif</Libelle>
            <input
              id="imageUneAlt"
              name="imageUneAlt"
              value={image.alt}
              onChange={(ev) => setImage((i) => ({ ...i, alt: ev.target.value }))}
              placeholder="Décrivez l'image pour les lecteurs malvoyants"
              className={classesChamp}
            />
            <Erreur texte={e.imageUneAlt} />
          </div>
        </div>
      </aside>
    </form>
  );
}
