"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useFormulaire } from "@/lib/hooks";
import { Reorder } from "motion/react";
import { ArrowDown, ArrowUp, Check, GripVertical, Loader2, Pencil, Plus, Reply, Send, X } from "lucide-react";
import {
  changerMotDePasse,
  enregistrerNumero,
  enregistrerRubrique,
  enregistrerUtilisateur,
  envoyerNewsletter,
  modifierMedia,
  renommerMotCle,
  repondreCommentaire,
  type Etat,
} from "@/lib/actions/gestion";
import { enregistrerUne } from "@/lib/actions/articles";
import { SelecteurMedia, type MediaLeger } from "@/components/admin/mediatheque";
import { classesBouton, classesChamp, Message } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

function Champ({ label, children, requis }: { label: string; children: React.ReactNode; requis?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">
        {label} {requis && <span className="text-danger" aria-hidden>*</span>}
      </span>
      {children}
    </label>
  );
}

function Soumettre({ enCours, children, variante = "principal" }: { enCours: boolean; children: React.ReactNode; variante?: keyof typeof classesBouton }) {
  return (
    <button disabled={enCours} className={classesBouton[variante]}>
      {enCours && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Rafraîchit la page après une action réussie. */
function useRafraichir(etat: Etat, apres?: () => void) {
  const router = useRouter();
  useEffect(() => {
    if (etat?.ok) {
      router.refresh();
      apres?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat]);
}

/* Rubriques */
export function FormulaireRubrique({
  rubrique,
  onFini,
}: {
  rubrique?: { id: string; nom: string; description: string | null; nomEn?: string | null; descriptionEn?: string | null; famille: string; couleur: string | null; ordre: number };
  onFini?: () => void;
}) {
  const { etat, onSubmit, enCours, ref } = useFormulaire(enregistrerRubrique, { viderSiSucces: !rubrique });
  useRafraichir(etat, onFini);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      {rubrique && <input type="hidden" name="id" value={rubrique.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_90px_110px]">
        <Champ label="Nom" requis><input name="nom" defaultValue={rubrique?.nom} required className={classesChamp} /></Champ>
        <Champ label="Famille">
          <select name="famille" defaultValue={rubrique?.famille ?? "THEMATIQUE"} className={classesChamp}>
            <option value="GEOGRAPHIQUE">Géographique</option>
            <option value="THEMATIQUE">Thématique</option>
          </select>
        </Champ>
        <Champ label="Ordre"><input name="ordre" type="number" min={0} defaultValue={rubrique?.ordre ?? 0} className={classesChamp} /></Champ>
        <Champ label="Couleur"><input name="couleur" type="color" defaultValue={rubrique?.couleur ?? "#cda40e"} className="h-10 w-full border border-ligne" /></Champ>
      </div>
      <Champ label="Description"><input name="description" defaultValue={rubrique?.description ?? ""} className={classesChamp} /></Champ>
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <Champ label="Nom en anglais"><input name="nomEn" lang="en" defaultValue={rubrique?.nomEn ?? ""} className={classesChamp} placeholder="ex. Women in tech" /></Champ>
        <Champ label="Description en anglais"><input name="descriptionEn" lang="en" defaultValue={rubrique?.descriptionEn ?? ""} className={classesChamp} /></Champ>
      </div>
      <div className="flex items-center gap-3">
        <Soumettre enCours={enCours}>{rubrique ? "Enregistrer" : <><Plus className="size-4" aria-hidden /> Créer la rubrique</>}</Soumettre>
        {onFini && <button type="button" onClick={onFini} className={classesBouton.lien}>Annuler</button>}
      </div>
      <Message etat={etat} />
    </form>
  );
}

export function LigneRubriqueEditable({ rubrique, children }: { rubrique: Parameters<typeof FormulaireRubrique>[0]["rubrique"] & {}; children: React.ReactNode }) {
  const [edition, setEdition] = useState(false);
  if (edition) return <div className="py-3"><FormulaireRubrique rubrique={rubrique} onFini={() => setEdition(false)} /></div>;
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      {children}
      <button type="button" onClick={() => setEdition(true)} className={cn(classesBouton.secondaire, "h-8 px-2")} title="Modifier" aria-label={`Modifier ${rubrique.nom}`}>
        <Pencil className="size-4" />
      </button>
    </div>
  );
}

/* Mots-clés */
export function MotCleEditable({ id, nom }: { id: string; nom: string }) {
  const [edition, setEdition] = useState(false);
  const [valeur, setValeur] = useState(nom);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const router = useRouter();
  if (!edition)
    return (
      <button type="button" onClick={() => setEdition(true)} className="group inline-flex items-center gap-1 font-medium hover:text-or-fonce">
        {nom} <Pencil className="size-3 opacity-0 group-hover:opacity-100" aria-hidden />
      </button>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <input value={valeur} onChange={(e) => setValeur(e.target.value)} className={cn(classesChamp, "h-8 w-48")} aria-label="Nouveau nom" autoFocus />
      <button
        type="button"
        disabled={enCours}
        aria-label="Valider"
        className={cn(classesBouton.principal, "h-8 px-2")}
        onClick={() =>
          demarrer(async () => {
            const r = await renommerMotCle(id, valeur);
            if (r?.ok) {
              setEdition(false);
              router.refresh();
            } else setErreur(r?.message ?? "Erreur");
          })
        }
      >
        <Check className="size-4" />
      </button>
      <button type="button" onClick={() => setEdition(false)} aria-label="Annuler" className={cn(classesBouton.secondaire, "h-8 px-2")}>
        <X className="size-4" />
      </button>
      {erreur && <span className="text-xs text-danger">{erreur}</span>}
    </span>
  );
}

/* La Une : ordre par glisser-déposer (ou flèches, accessible au clavier) */
type ArticleUne = { id: string; titre: string; imageUneUrl: string | null; rubrique: string };

export function OrdreUne({ initiaux, disponibles }: { initiaux: ArticleUne[]; disponibles: ArticleUne[] }) {
  const [liste, setListe] = useState(initiaux);
  const [etat, setEtat] = useState<Etat>(null);
  const [enCours, demarrer] = useTransition();
  const router = useRouter();
  const restants = disponibles.filter((d) => !liste.some((l) => l.id === d.id));
  const deplacer = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= liste.length) return;
    const copie = [...liste];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    setListe(copie);
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 font-titre text-sm uppercase tracking-[0.14em]">Carrousel ({liste.length})</h2>
        <Reorder.Group axis="y" values={liste} onReorder={setListe} className="space-y-2">
          {liste.map((a, i) => (
            <Reorder.Item key={a.id} value={a} className="flex cursor-grab items-center gap-3 border border-ligne bg-fond p-2 active:cursor-grabbing">
              <GripVertical className="size-4 shrink-0 text-texte-doux" aria-hidden />
              <span className="grid size-7 shrink-0 place-items-center bg-or font-titre text-sm">{i + 1}</span>
              <div className="relative size-12 shrink-0 overflow-hidden bg-fond-2">
                {a.imageUneUrl && <Image src={a.imageUneUrl} alt="" fill sizes="48px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold">{a.titre}</p>
                <p className="text-xs text-texte-doux">{a.rubrique}</p>
              </div>
              <button type="button" onClick={() => deplacer(i, -1)} aria-label="Monter" className="p-1 hover:text-or-fonce"><ArrowUp className="size-4" /></button>
              <button type="button" onClick={() => deplacer(i, 1)} aria-label="Descendre" className="p-1 hover:text-or-fonce"><ArrowDown className="size-4" /></button>
              <button type="button" onClick={() => setListe(liste.filter((x) => x.id !== a.id))} aria-label="Retirer de la Une" className="p-1 hover:text-danger"><X className="size-4" /></button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
        {liste.length === 0 && <p className="border border-dashed border-ligne p-6 text-center text-sm text-texte-doux">Aucun article : le carrousel affichera les plus récents.</p>}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={enCours}
            className={classesBouton.or}
            onClick={() =>
              demarrer(async () => {
                setEtat(await enregistrerUne(liste.map((l) => l.id)));
                router.refresh();
              })
            }
          >
            {enCours && <Loader2 className="size-4 animate-spin" aria-hidden />} Enregistrer la Une
          </button>
        </div>
        <div className="mt-3"><Message etat={etat} /></div>
      </div>
      <div>
        <h2 className="mb-3 font-titre text-sm uppercase tracking-[0.14em]">Articles publiés</h2>
        <ul className="max-h-[560px] space-y-1 overflow-y-auto">
          {restants.map((a) => (
            <li key={a.id} className="flex items-center gap-3 border border-ligne bg-fond p-2">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">{a.titre}</p>
                <p className="text-xs text-texte-doux">{a.rubrique}</p>
              </div>
              <button type="button" onClick={() => setListe([...liste, a])} disabled={liste.length >= 8} className={cn(classesBouton.secondaire, "h-8 px-2")} aria-label={`Ajouter « ${a.titre} » à la Une`}>
                <Plus className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* Commentaires : réponse de la rédaction */
export function ReponseRedaction({ commentaireId }: { commentaireId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [etat, setEtat] = useState<Etat>(null);
  const [enCours, demarrer] = useTransition();
  const router = useRouter();
  if (!ouvert)
    return (
      <button type="button" onClick={() => setOuvert(true)} className={cn(classesBouton.secondaire, "h-8 px-3")}>
        <Reply className="size-4" aria-hidden /> Répondre
      </button>
    );
  return (
    <div className="mt-3 w-full space-y-2">
      <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} className={cn(classesChamp, "h-auto py-2")} placeholder="Réponse publiée au nom de la rédaction" aria-label="Réponse" />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={enCours}
          className={cn(classesBouton.principal, "h-8 px-3")}
          onClick={() =>
            demarrer(async () => {
              const r = await repondreCommentaire(commentaireId, texte);
              setEtat(r);
              if (r?.ok) {
                setTexte("");
                setOuvert(false);
                router.refresh();
              }
            })
          }
        >
          <Send className="size-4" aria-hidden /> Publier
        </button>
        <button type="button" onClick={() => setOuvert(false)} className={classesBouton.lien}>Annuler</button>
      </div>
      <Message etat={etat} />
    </div>
  );
}

/* Médias */
export function EditionMedia({ id, alt, legende }: { id: string; alt: string; legende: string | null }) {
  const [a, setA] = useState(alt);
  const [l, setL] = useState(legende ?? "");
  const [etat, setEtat] = useState<Etat>(null);
  const [enCours, demarrer] = useTransition();
  const modifie = a !== alt || l !== (legende ?? "");
  return (
    <div className="space-y-1.5">
      <input value={a} onChange={(e) => setA(e.target.value)} className={cn(classesChamp, "h-8 text-xs")} aria-label="Texte alternatif" placeholder="Texte alternatif" />
      <input value={l} onChange={(e) => setL(e.target.value)} className={cn(classesChamp, "h-8 text-xs")} aria-label="Légende" placeholder="Légende / crédit" />
      {modifie && (
        <button type="button" disabled={enCours} onClick={() => demarrer(async () => setEtat(await modifierMedia(id, a, l)))} className={cn(classesBouton.principal, "h-8 w-full text-xs")}>
          Enregistrer
        </button>
      )}
      {etat && <p className={cn("text-xs", etat.ok ? "text-succes" : "text-danger")}>{etat.message}</p>}
    </div>
  );
}

/* Numéros mensuels */
type ArticleChoix = { id: string; titre: string; rubrique: string };

export function FormulaireNumero({
  numero,
  articles,
  medias,
  onFini,
}: {
  numero?: { id: string; titre: string; titreEn?: string | null; mois: string; couvertureUrl: string; pdfUrl: string | null; edito: string | null; editoEn?: string | null; publie: boolean; articleIds: string[] };
  articles: ArticleChoix[];
  medias: MediaLeger[];
  onFini?: () => void;
}) {
  const { etat, onSubmit, enCours, ref } = useFormulaire(enregistrerNumero, { viderSiSucces: !numero });
  const [choisis, setChoisis] = useState<string[]>(numero?.articleIds ?? []);
  const [couverture, setCouverture] = useState(numero?.couvertureUrl ?? "");
  const [pdf, setPdf] = useState(numero?.pdfUrl ?? "");
  useRafraichir(etat, onFini);
  const basculer = (id: string) => setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4">
      {numero && <input type="hidden" name="id" value={numero.id} />}
      <input type="hidden" name="articles" value={choisis.join(",")} />
      <input type="hidden" name="couvertureUrl" value={couverture} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <Champ label="Titre" requis><input name="titre" defaultValue={numero?.titre} required className={classesChamp} placeholder="DIWA MAG — Janvier 2027" /></Champ>
        <Champ label="Mois" requis><input name="mois" type="month" defaultValue={numero?.mois} required className={classesChamp} /></Champ>
      </div>
      <Champ label="Édito / présentation"><textarea name="edito" rows={3} defaultValue={numero?.edito ?? ""} className={cn(classesChamp, "h-auto py-2")} /></Champ>
      <Champ label="Titre en anglais"><input name="titreEn" lang="en" defaultValue={numero?.titreEn ?? ""} className={classesChamp} placeholder="DIWA MAG — January 2027" /></Champ>
      <Champ label="Édito en anglais"><textarea name="editoEn" lang="en" rows={3} defaultValue={numero?.editoEn ?? ""} className={cn(classesChamp, "h-auto py-2")} /></Champ>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Couverture <span className="text-danger" aria-hidden>*</span></p>
          {couverture && (
            <div className="relative aspect-[3/4] w-32 overflow-hidden bg-fond-2">
              <Image src={couverture} alt="Couverture" fill sizes="128px" className="object-cover" />
            </div>
          )}
          <SelecteurMedia medias={medias} libelle={couverture ? "Changer" : "Choisir la couverture"} onChoisir={(m) => setCouverture(m.url)} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Version PDF</p>
          <input name="pdfUrl" value={pdf} onChange={(e) => setPdf(e.target.value)} className={classesChamp} placeholder="https://… (ou téléverser)" aria-label="URL du PDF" />
          <SelecteurMedia medias={medias} type="PDF" libelle="Téléverser / choisir un PDF" onChoisir={(m) => setPdf(m.url)} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Articles du numéro ({choisis.length}) — l&apos;ordre de sélection fait le sommaire</p>
        <ul className="max-h-72 space-y-1 overflow-y-auto border border-ligne p-2">
          {articles.map((a) => {
            const rang = choisis.indexOf(a.id);
            return (
              <li key={a.id}>
                <label className="flex cursor-pointer items-center gap-2 px-2 py-1 text-sm hover:bg-fond-2">
                  <input type="checkbox" checked={rang >= 0} onChange={() => basculer(a.id)} className="accent-[var(--or)]" />
                  {rang >= 0 && <span className="grid size-5 place-items-center bg-or text-[10px] font-bold">{rang + 1}</span>}
                  <span className="line-clamp-1 flex-1">{a.titre}</span>
                  <span className="text-xs text-texte-doux">{a.rubrique}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="publie" defaultChecked={numero?.publie ?? false} className="size-4 accent-[var(--or)]" /> Publier ce numéro sur le site
      </label>
      <div className="flex items-center gap-3">
        <Soumettre enCours={enCours} variante="or">Enregistrer le numéro</Soumettre>
        {onFini && <button type="button" onClick={onFini} className={classesBouton.lien}>Annuler</button>}
      </div>
      <Message etat={etat} />
    </form>
  );
}

export function NumeroEditable({ children, ...props }: Parameters<typeof FormulaireNumero>[0] & { children: React.ReactNode }) {
  const [edition, setEdition] = useState(false);
  if (edition) return <div className="border border-or bg-fond p-5"><FormulaireNumero {...props} onFini={() => setEdition(false)} /></div>;
  return (
    <div className="relative">
      {children}
      <button type="button" onClick={() => setEdition(true)} className={cn(classesBouton.secondaire, "absolute right-3 top-3 h-8 px-2")} aria-label="Modifier le numéro">
        <Pencil className="size-4" />
      </button>
    </div>
  );
}

/* Newsletter */
export function FormulaireEnvoiNewsletter({ numeros, abonnes }: { numeros: { id: string; titre: string }[]; abonnes: number }) {
  const { etat, onSubmit, enCours, ref } = useFormulaire(envoyerNewsletter, { viderSiSucces: true });
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        if (!confirm(`Envoyer la newsletter à ${abonnes} abonné(s) confirmé(s) ?`)) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="space-y-3"
    >
      <Champ label="Objet" requis><input name="sujet" required className={classesChamp} placeholder="DIWA MAG — le numéro de décembre est en ligne" /></Champ>
      <Champ label="Contenu">
        <select name="numeroId" className={classesChamp} defaultValue="">
          <option value="">Les 6 derniers articles publiés</option>
          {numeros.map((n) => <option key={n.id} value={n.id}>Sommaire : {n.titre}</option>)}
        </select>
      </Champ>
      <Champ label="Message d'introduction"><textarea name="intro" rows={4} className={cn(classesChamp, "h-auto py-2")} /></Champ>
      <Soumettre enCours={enCours} variante="or"><Send className="size-4" aria-hidden /> Envoyer</Soumettre>
      <Message etat={etat} />
    </form>
  );
}

/* Utilisateurs */
export function FormulaireUtilisateur({
  utilisateur,
  onFini,
}: {
  utilisateur?: { id: string; nom: string; email: string; role: string; bio: string | null };
  onFini?: () => void;
}) {
  const { etat, onSubmit, enCours, ref } = useFormulaire(enregistrerUtilisateur, { viderSiSucces: false });
  useRafraichir(etat, etat?.message.includes("provisoire") ? undefined : onFini);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      {utilisateur && <input type="hidden" name="id" value={utilisateur.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Champ label="Nom" requis><input name="nom" defaultValue={utilisateur?.nom} required className={classesChamp} /></Champ>
        <Champ label="E-mail" requis><input name="email" type="email" defaultValue={utilisateur?.email} required className={classesChamp} /></Champ>
        <Champ label="Rôle">
          <select name="role" defaultValue={utilisateur?.role ?? "ADMIN"} className={classesChamp}>
            <option value="ADMIN">Administrateur</option>
            <option value="SUPER_ADMIN">Super-administrateur</option>
          </select>
        </Champ>
      </div>
      <Champ label="Biographie (page auteur)"><input name="bio" defaultValue={utilisateur?.bio ?? ""} className={classesChamp} /></Champ>
      <Champ label={utilisateur ? "Nouveau mot de passe (laisser vide pour conserver)" : "Mot de passe (laisser vide pour en générer un)"}>
        <input name="motDePasse" type="password" autoComplete="new-password" minLength={10} className={classesChamp} />
      </Champ>
      <div className="flex items-center gap-3">
        <Soumettre enCours={enCours}>{utilisateur ? "Enregistrer" : <><Plus className="size-4" aria-hidden /> Créer le compte</>}</Soumettre>
        {onFini && <button type="button" onClick={onFini} className={classesBouton.lien}>Fermer</button>}
      </div>
      <Message etat={etat} />
    </form>
  );
}

export function UtilisateurEditable({ utilisateur, children }: { utilisateur: NonNullable<Parameters<typeof FormulaireUtilisateur>[0]["utilisateur"]>; children: React.ReactNode }) {
  const [edition, setEdition] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <button type="button" onClick={() => setEdition((e) => !e)} className={cn(classesBouton.secondaire, "h-8 px-2")} aria-label={`Modifier ${utilisateur.nom}`}>
          <Pencil className="size-4" />
        </button>
      </div>
      {edition && <div className="mt-3 w-full border-t border-ligne pt-3"><FormulaireUtilisateur utilisateur={utilisateur} onFini={() => setEdition(false)} /></div>}
    </>
  );
}

export function FormulaireMotDePasse() {
  const { etat, onSubmit, enCours, ref } = useFormulaire(changerMotDePasse, { viderSiSucces: true });
  return (
    <form ref={ref} onSubmit={onSubmit} className="max-w-sm space-y-3">
      <Champ label="Mot de passe actuel" requis><input name="actuel" type="password" required autoComplete="current-password" className={classesChamp} /></Champ>
      <Champ label="Nouveau mot de passe (10 caractères min.)" requis><input name="nouveau" type="password" required minLength={10} autoComplete="new-password" className={classesChamp} /></Champ>
      <Soumettre enCours={enCours}>Changer le mot de passe</Soumettre>
      <Message etat={etat} />
    </form>
  );
}
