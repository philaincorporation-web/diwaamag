"use client";
// Interface de l'importation de PDF : dépôt du fichier, suivi du traitement, vérification et
// correction du résultat avant création du brouillon.

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Eye, FileUp, ImagePlus, Loader2, Pencil, Plus, RotateCcw, Star, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { classesBouton, classesChamp } from "@/components/admin/styles";
import { TexteRiche } from "@/components/site/texte-riche";
import { blocsVersTiptap, type ImageResolue } from "@/lib/import-pdf/conversion";
import type { Bloc, ResultatImport } from "@/lib/import-pdf/schema";
import { creerBrouillonDepuisImport, type Revue } from "@/lib/actions/imports";

const mo = (octets: number) => `${(octets / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;

async function sha256(fichier: File) {
  const hash = await crypto.subtle.digest("SHA-256", await fichier.arrayBuffer());
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function lireErreur(res: Response) {
  const d = (await res.json().catch(() => null)) as { erreur?: string } | null;
  return d?.erreur || `Erreur ${res.status}`;
}

type Envoi = { mode: "cloudinary"; url: string; champs: Record<string, string> } | { mode: "local"; url: string };

/** Envoi avec progression (XMLHttpRequest : fetch n'expose pas la progression de l'envoi). */
function envoyer(envoi: Envoi, fichier: File, progression: (p: number) => void, xhrRef: React.RefObject<XMLHttpRequest | null>) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.upload.onprogress = (e) => e.lengthComputable && progression(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let detail = "";
      try {
        detail = (JSON.parse(xhr.responseText) as { erreur?: string }).erreur ?? "";
      } catch {}
      reject(new Error(detail || `L'envoi du fichier a échoué (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Connexion interrompue pendant l'envoi."));
    xhr.onabort = () => reject(new Error("Envoi annulé."));
    if (envoi.mode === "cloudinary") {
      const corps = new FormData();
      for (const [k, v] of Object.entries(envoi.champs)) corps.append(k, v);
      corps.append("file", fichier);
      xhr.open("POST", envoi.url);
      xhr.send(corps);
    } else {
      xhr.open("PUT", envoi.url);
      xhr.setRequestHeader("Content-Type", "application/pdf");
      xhr.send(fichier);
    }
  });
}

/* ─── 1. Dépôt du fichier ─────────────────────────────────────────────────── */

export function ZoneImport({ tailleMaxMo, pagesMax, iaActive }: { tailleMaxMo: number; pagesMax: number; iaActive: boolean }) {
  const router = useRouter();
  const [fichier, setFichier] = useState<File | null>(null);
  const [survol, setSurvol] = useState(false);
  const [etat, setEtat] = useState<{ phase: "repos" | "preparation" | "envoi" | "lancement"; progression: number }>({ phase: "repos", progression: 0 });
  const [erreur, setErreur] = useState<string | null>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const importId = useRef<string | null>(null);
  const occupe = etat.phase !== "repos";

  function choisir(f: File | undefined | null) {
    setErreur(null);
    if (!f) return;
    if (f.type && f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setErreur("Seuls les fichiers PDF sont acceptés.");
    if (f.size === 0) return setErreur("Ce fichier est vide.");
    if (f.size > tailleMaxMo * 1024 * 1024) return setErreur(`Fichier trop volumineux (${mo(f.size)}) : ${tailleMaxMo} Mo maximum.`);
    setFichier(f);
  }

  async function lancer() {
    if (!fichier || occupe) return;
    setErreur(null);
    try {
      setEtat({ phase: "preparation", progression: 0 });
      // Contrôle du contenu réel (signature %PDF-), pas seulement de l'extension.
      const entete = new TextDecoder("latin1").decode(await fichier.slice(0, 1024).arrayBuffer());
      if (!entete.includes("%PDF-")) throw new Error("Ce fichier n'est pas un PDF valide.");
      const empreinte = await sha256(fichier);
      const res = await fetch("/api/admin/imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: fichier.name, taille: fichier.size, empreinte }) });
      if (!res.ok) throw new Error(await lireErreur(res));
      const d = (await res.json()) as { id: string; existant?: boolean; envoi?: Envoi };
      importId.current = d.id;
      if (d.existant) {
        router.push(`/admin/imports/${d.id}?doublon=1`);
        return;
      }
      setEtat({ phase: "envoi", progression: 0 });
      await envoyer(d.envoi!, fichier, (p) => setEtat({ phase: "envoi", progression: p }), xhr);
      setEtat({ phase: "lancement", progression: 100 });
      const l = await fetch(`/api/admin/imports/${d.id}/lancer`, { method: "POST" });
      if (!l.ok) throw new Error(await lireErreur(l));
      router.push(`/admin/imports/${d.id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'import a échoué.");
      setEtat({ phase: "repos", progression: 0 });
      if (importId.current) await fetch(`/api/admin/imports/${importId.current}/annuler`, { method: "POST" }).catch(() => {});
      importId.current = null;
    }
  }

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          if (!occupe) choisir(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 text-center transition-colors",
          survol ? "border-or bg-or-clair" : "border-ligne hover:border-or",
          occupe && "pointer-events-none opacity-60",
        )}
      >
        <FileUp className="size-10 text-or-fonce" aria-hidden />
        <span className="font-semibold">Déposez un PDF ici ou cliquez pour le choisir</span>
        <span className="text-sm text-texte-doux">
          PDF uniquement · {tailleMaxMo} Mo et {pagesMax} pages maximum · un article par fichier
        </span>
        <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={occupe} onChange={(e) => choisir(e.target.files?.[0])} />
      </label>

      {fichier && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-ligne px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{fichier.name}</p>
            <p className="text-sm text-texte-doux">{mo(fichier.size)}</p>
          </div>
          <div className="flex gap-2">
            {etat.phase === "envoi" ? (
              <button type="button" className={classesBouton.secondaire} onClick={() => xhr.current?.abort()}>
                <X className="size-4" aria-hidden /> Annuler l&apos;envoi
              </button>
            ) : (
              <button type="button" className={classesBouton.secondaire} disabled={occupe} onClick={() => setFichier(null)}>
                Changer de fichier
              </button>
            )}
            <button type="button" className={classesBouton.or} disabled={occupe} onClick={lancer}>
              {occupe ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileUp className="size-4" aria-hidden />}
              Importer et analyser
            </button>
          </div>
        </div>
      )}

      {occupe && (
        <div aria-live="polite">
          <p className="mb-1 text-sm text-texte-doux">
            {etat.phase === "preparation" ? "Vérification du fichier…" : etat.phase === "envoi" ? `Envoi du fichier… ${etat.progression} %` : "Démarrage de l'analyse…"}
          </p>
          <div className="h-2 bg-fond-2">
            <div className="h-full bg-or transition-all" style={{ width: `${etat.phase === "preparation" ? 5 : etat.progression}%` }} />
          </div>
        </div>
      )}
      {erreur && (
        <p role="alert" className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {erreur}
        </p>
      )}
      {!iaActive && (
        <p className="flex gap-2 border border-ligne bg-or-clair/50 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-or-fonce" aria-hidden />
          Analyse par IA non configurée (variable ANTHROPIC_API_KEY) : une analyse automatique simplifiée sera utilisée, et les PDF scannés ne pourront pas être lus.
        </p>
      )}
    </div>
  );
}

/* ─── 2. Suivi du traitement ──────────────────────────────────────────────── */

type Etat = { statut: string; etape: string | null; progression: number; erreur: string | null };
const EN_COURS = ["TELEVERSE", "EN_ATTENTE", "EN_COURS"];

export function SuiviImport({ importId, initial }: { importId: string; initial: Etat }) {
  const router = useRouter();
  const [etat, setEtat] = useState(initial);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    if (!EN_COURS.includes(etat.statut)) return;
    const minuteur = setInterval(async () => {
      const res = await fetch(`/api/admin/imports/${importId}`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const d = (await res.json()) as Etat;
      setEtat(d);
      if (!EN_COURS.includes(d.statut)) router.refresh();
    }, 2000);
    return () => clearInterval(minuteur);
  }, [etat.statut, importId, router]);

  async function action(chemin: "lancer" | "annuler") {
    if (chemin === "annuler" && !confirm("Abandonner cet import ? Le PDF et les images extraites seront supprimés.")) return;
    setOccupe(true);
    const res = await fetch(`/api/admin/imports/${importId}/${chemin}`, { method: "POST" });
    if (!res.ok) alert(await lireErreur(res));
    setOccupe(false);
    if (chemin === "lancer" && res.ok) setEtat({ statut: "EN_ATTENTE", etape: "En file d'attente", progression: 0, erreur: null });
    router.refresh();
  }

  if (etat.statut === "ECHEC") {
    return (
      <div className="space-y-4">
        <p role="alert" className="flex gap-2 border border-danger/30 bg-danger/5 px-4 py-3 text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {etat.erreur || "Le traitement a échoué."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={classesBouton.or} disabled={occupe} onClick={() => action("lancer")}>
            <RotateCcw className="size-4" aria-hidden /> Relancer l&apos;analyse
          </button>
          <button type="button" className={classesBouton.danger} disabled={occupe} onClick={() => action("annuler")}>
            <Trash2 className="size-4" aria-hidden /> Abandonner l&apos;import
          </button>
        </div>
      </div>
    );
  }
  if (!EN_COURS.includes(etat.statut)) return null;
  const incomplet = etat.statut === "TELEVERSE";
  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex items-center gap-3">
        {!incomplet && <Loader2 className="size-5 animate-spin text-or-fonce" aria-hidden />}
        <p className="font-semibold">{incomplet ? "L'envoi du fichier n'a pas été terminé." : etat.etape || "Traitement en cours…"}</p>
      </div>
      {!incomplet && (
        <div className="h-2 bg-fond-2">
          <div className="h-full bg-or transition-all" style={{ width: `${Math.max(5, etat.progression)}%` }} />
        </div>
      )}
      <p className="text-sm text-texte-doux">
        {incomplet
          ? "Abandonnez cet import puis déposez de nouveau le fichier."
          : "Vous pouvez quitter cette page : le traitement continue et le résultat vous attendra dans « Import PDF »."}
      </p>
      <button type="button" className={classesBouton.secondaire} disabled={occupe} onClick={() => action("annuler")}>
        <X className="size-4" aria-hidden /> {incomplet ? "Abandonner l'import" : "Annuler le traitement"}
      </button>
    </div>
  );
}

/* ─── 3. Vérification et correction ───────────────────────────────────────── */

type ChoixImage = { conserver: boolean; alt: string; legende: string; credit: string };
type Rubrique = { id: string; slug: string; nom: string };

const LIBELLES_BLOC: Record<Bloc["type"], string> = {
  intertitre: "Intertitre",
  paragraphe: "Paragraphe",
  citation: "Citation",
  liste: "Liste",
  encadre: "Encadré",
  image: "Image",
};
const LIBELLES_ROLE: Record<string, string> = {
  principale: "Image principale",
  illustration: "Illustration",
  portrait: "Portrait",
  infographie: "Infographie",
  decoration: "Décoration",
};

function Champ({ label, erreur, aide, children }: { label: string; erreur?: string; aide?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {aide && !erreur && <span className="mt-1 block text-xs text-texte-doux">{aide}</span>}
      {erreur && <span className="mt-1 block text-xs font-semibold text-danger">{erreur}</span>}
    </label>
  );
}

export function RevueImport({ importId, resultat, rubriques, nbPages }: { importId: string; resultat: ResultatImport; rubriques: Rubrique[]; nbPages: number }) {
  const router = useRouter();
  const a = resultat.analyse;
  const infosImages = useMemo(() => {
    const m = new Map<string, { role: string; alt: string; legende: string | null; credit: string | null; section: string | null; confiance: string }>();
    for (const i of a.images) m.set(i.imageId, i);
    for (const z of a.zones) m.set(z.id, z);
    return m;
  }, [a]);

  const [titre, setTitre] = useState(a.titre);
  const [chapeau, setChapeau] = useState(a.chapeau ?? "");
  const [rubriqueId, setRubriqueId] = useState(rubriques.find((r) => r.slug === a.rubrique)?.id ?? "");
  const [type, setType] = useState(a.type);
  const [slug, setSlug] = useState(a.seo.slug);
  const [metaTitre, setMetaTitre] = useState(a.seo.metaTitre.slice(0, 70));
  const [metaDescription, setMetaDescription] = useState(a.seo.metaDescription.slice(0, 160));
  const [motsCles, setMotsCles] = useState(a.seo.motsCles.join(", "));
  const [blocs, setBlocs] = useState<Bloc[]>(a.blocs.filter((b) => b.type !== "image" || resultat.images.some((i) => i.id === b.imageId)));
  const [choix, setChoix] = useState<Record<string, ChoixImage>>(() =>
    Object.fromEntries(
      resultat.images.map((img) => {
        const info = infosImages.get(img.id);
        return [img.id, { conserver: info?.role !== "decoration", alt: info?.alt ?? "", legende: info?.legende ?? "", credit: info?.credit ?? "" }];
      }),
    ),
  );
  const [imageUne, setImageUne] = useState<string | null>(a.imageUne && resultat.images.some((i) => i.id === a.imageUne) ? a.imageUne : null);
  const [page, setPage] = useState(1);
  const [vue, setVue] = useState<"edition" | "apercu">("edition");
  const [etat, setEtat] = useState<{ message: string; erreurs?: Record<string, string> } | null>(null);
  const [enCours, demarrer] = useTransition();

  const imagesResolues = useMemo(() => {
    const m = new Map<string, ImageResolue>();
    for (const img of resultat.images) {
      const c = choix[img.id];
      if (c?.conserver) m.set(img.id, { url: img.url, alt: c.alt, legende: c.legende || null, credit: c.credit || null });
    }
    return m;
  }, [choix, resultat.images]);
  const placees = new Set(blocs.filter((b) => b.type === "image").map((b) => b.imageId));

  const modifierBloc = (i: number, maj: Partial<Bloc>) => setBlocs((bs) => bs.map((b, j) => (j === i ? { ...b, ...maj } : b)));
  const deplacer = (i: number, sens: -1 | 1) =>
    setBlocs((bs) => {
      const j = i + sens;
      if (j < 0 || j >= bs.length) return bs;
      const copie = [...bs];
      [copie[i], copie[j]] = [copie[j], copie[i]];
      return copie;
    });
  const nouveauBloc = (type: Bloc["type"], extra: Partial<Bloc> = {}): Bloc => ({
    type,
    texte: "",
    niveau: type === "intertitre" ? 2 : null,
    elements: null,
    ordonnee: null,
    attribution: null,
    titre: null,
    imageId: null,
    page: null,
    aVerifier: false,
    ...extra,
  });
  const majImage = (id: string, maj: Partial<ChoixImage>) => setChoix((c) => ({ ...c, [id]: { ...c[id], ...maj } }));

  function valider() {
    setEtat(null);
    const donnees: Revue = {
      titre,
      chapeau,
      rubriqueId,
      type,
      slug,
      metaTitre,
      metaDescription,
      motsCles: motsCles.split(",").map((s) => s.trim()).filter(Boolean),
      blocs: blocs.filter((b) => b.type !== "image" || choix[b.imageId ?? ""]?.conserver),
      images: resultat.images.map((img) => ({ id: img.id, ...choix[img.id], legende: choix[img.id].legende || null, credit: choix[img.id].credit || null })),
      imageUne: imageUne && choix[imageUne]?.conserver ? imageUne : null,
    };
    demarrer(async () => {
      const r = await creerBrouillonDepuisImport(importId, donnees);
      if (r && !r.ok) {
        setEtat(r);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  async function relancer() {
    if (!confirm("Relancer l'analyse ? Vos corrections sur cette page seront perdues et une nouvelle analyse sera facturée.")) return;
    const res = await fetch(`/api/admin/imports/${importId}/lancer`, { method: "POST" });
    if (!res.ok) return alert(await lireErreur(res));
    router.refresh();
  }
  async function abandonner() {
    if (!confirm("Abandonner cet import ? Le PDF et les images extraites seront supprimés.")) return;
    const res = await fetch(`/api/admin/imports/${importId}/annuler`, { method: "POST" });
    if (!res.ok) return alert(await lireErreur(res));
    router.push("/admin/imports");
  }

  const avertissements = [
    ...(a.surtitre ? [`Surtitre détecté : « ${a.surtitre} ».`] : []),
    ...(a.sousTitre ? [`Sous-titre détecté : « ${a.sousTitre} » — le site n'a pas de champ dédié : intégrez-le au chapeau si besoin.`] : []),
    ...(!rubriqueId ? ["Aucune rubrique n'a pu être déterminée : choisissez-en une."] : []),
    ...resultat.avertissements,
  ];
  const aVerifier = blocs.filter((b) => b.aVerifier).length;

  return (
    <div className="space-y-6">
      {etat && (
        <div role="alert" className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <p className="font-semibold">{etat.message}</p>
          {etat.erreurs && (
            <ul className="mt-1 list-disc pl-5">
              {Object.values(etat.erreurs).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(avertissements.length > 0 || aVerifier > 0) && (
        <section className="border border-or/50 bg-or-clair/40 px-5 py-4">
          <h2 className="mb-2 flex items-center gap-2 font-titre text-sm uppercase tracking-[0.14em]">
            <AlertTriangle className="size-4 text-or-fonce" aria-hidden /> À vérifier avant validation
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {aVerifier > 0 && <li>{aVerifier} passage(s) signalé(s) comme incertain(s), surligné(s) ci-dessous.</li>}
            {avertissements.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
        <div className="min-w-0 space-y-6">
          {/* Informations principales */}
          <section className="space-y-4 border border-ligne p-5">
            <h2 className="font-titre text-sm uppercase tracking-[0.14em]">Article</h2>
            <Champ label="Titre" erreur={etat?.erreurs?.titre}>
              <input className={classesChamp} value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={200} />
            </Champ>
            <Champ label="Chapeau" erreur={etat?.erreurs?.chapeau} aide="Texte d'introduction (20 caractères minimum pour publier).">
              <textarea className={cn(classesChamp, "h-auto min-h-24 py-2")} value={chapeau} onChange={(e) => setChapeau(e.target.value)} maxLength={600} />
            </Champ>
            <div className="grid gap-4 sm:grid-cols-2">
              <Champ label="Rubrique" erreur={etat?.erreurs?.rubriqueId}>
                <select className={classesChamp} value={rubriqueId} onChange={(e) => setRubriqueId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {rubriques.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nom}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label="Type de contenu">
                <select className={classesChamp} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                  <option value="ACTUALITE">Actualité</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="DOSSIER">Dossier</option>
                </select>
              </Champ>
            </div>
          </section>

          {/* Corps de l'article */}
          <section className="border border-ligne">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ligne px-5 py-3">
              <h2 className="font-titre text-sm uppercase tracking-[0.14em]">Contenu ({blocs.length} blocs)</h2>
              <div className="flex gap-1" role="tablist">
                <button type="button" role="tab" aria-selected={vue === "edition"} onClick={() => setVue("edition")} className={cn("inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold", vue === "edition" ? "bg-noir text-white" : "hover:bg-fond-2")}>
                  <Pencil className="size-3.5" aria-hidden /> Corriger
                </button>
                <button type="button" role="tab" aria-selected={vue === "apercu"} onClick={() => setVue("apercu")} className={cn("inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold", vue === "apercu" ? "bg-noir text-white" : "hover:bg-fond-2")}>
                  <Eye className="size-3.5" aria-hidden /> Aperçu web
                </button>
              </div>
            </div>

            {vue === "apercu" ? (
              <article className="mx-auto max-w-3xl px-4 py-8">
                <h1 className="text-center font-titre text-3xl font-bold uppercase leading-tight sm:text-4xl">{titre}</h1>
                {chapeau && <p className="mt-5 text-center font-serif text-lg text-texte-doux">{chapeau}</p>}
                {imageUne && imagesResolues.get(imageUne) && (
                  <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-fond-2">
                    <Image src={imagesResolues.get(imageUne)!.url} alt={imagesResolues.get(imageUne)!.alt} fill sizes="768px" className="object-cover object-top" />
                  </div>
                )}
                <div className="mt-8">
                  <TexteRiche doc={blocsVersTiptap(blocs.filter((b) => !(b.type === "image" && b.imageId === imageUne)), imagesResolues)} />
                </div>
              </article>
            ) : (
              <ol className="divide-y divide-ligne">
                {blocs.map((b, i) => (
                  <li key={i} className={cn("space-y-2 px-5 py-4", b.aVerifier && "bg-or-clair/50")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-titre text-xs uppercase tracking-[0.14em] text-or-fonce">{LIBELLES_BLOC[b.type]}</span>
                      {b.page && (
                        <button type="button" className="text-xs text-texte-doux underline" onClick={() => setPage(b.page!)}>
                          page {b.page}
                        </button>
                      )}
                      {b.aVerifier && <span className="bg-or px-1.5 text-[11px] font-bold text-noir">À VÉRIFIER</span>}
                      <span className="ml-auto flex gap-1">
                        <button type="button" aria-label="Monter" className="p-1 hover:text-or-fonce disabled:opacity-30" disabled={i === 0} onClick={() => deplacer(i, -1)}>
                          <ArrowUp className="size-4" />
                        </button>
                        <button type="button" aria-label="Descendre" className="p-1 hover:text-or-fonce disabled:opacity-30" disabled={i === blocs.length - 1} onClick={() => deplacer(i, 1)}>
                          <ArrowDown className="size-4" />
                        </button>
                        <button type="button" aria-label="Supprimer le bloc" className="p-1 hover:text-danger" onClick={() => setBlocs((bs) => bs.filter((_, j) => j !== i))}>
                          <Trash2 className="size-4" />
                        </button>
                      </span>
                    </div>
                    {b.type === "image" ? (
                      (() => {
                        const img = resultat.images.find((x) => x.id === b.imageId);
                        if (!img) return null;
                        return (
                          <div className="flex items-center gap-3">
                            <div className="relative h-20 w-28 shrink-0 bg-fond-2">
                              <Image src={img.url} alt="" fill sizes="112px" className="object-contain" />
                            </div>
                            <p className="text-sm text-texte-doux">
                              {choix[img.id]?.conserver ? choix[img.id].legende || "Sans légende" : "Image écartée : elle ne sera pas insérée."}
                            </p>
                          </div>
                        );
                      })()
                    ) : b.type === "liste" ? (
                      <textarea
                        aria-label="Éléments de la liste, un par ligne"
                        className={cn(classesChamp, "h-auto min-h-20 py-2")}
                        value={(b.elements ?? []).join("\n")}
                        onChange={(e) => modifierBloc(i, { elements: e.target.value.split("\n") })}
                      />
                    ) : (
                      <>
                        {b.type === "encadre" && (
                          <input aria-label="Titre de l'encadré" placeholder="Titre de l'encadré (facultatif)" className={classesChamp} value={b.titre ?? ""} onChange={(e) => modifierBloc(i, { titre: e.target.value || null })} />
                        )}
                        <textarea
                          aria-label={LIBELLES_BLOC[b.type]}
                          className={cn(classesChamp, "h-auto py-2", b.type === "intertitre" ? "min-h-10 font-semibold" : "min-h-24", b.type === "citation" && "italic")}
                          value={b.texte}
                          onChange={(e) => modifierBloc(i, { texte: e.target.value })}
                        />
                        {b.type === "intertitre" && (
                          <select aria-label="Niveau" className={cn(classesChamp, "w-auto")} value={b.niveau ?? 2} onChange={(e) => modifierBloc(i, { niveau: Number(e.target.value) })}>
                            <option value={2}>Intertitre principal</option>
                            <option value={3}>Sous-intertitre</option>
                          </select>
                        )}
                        {b.type === "citation" && (
                          <input aria-label="Auteur de la citation" placeholder="Auteur de la citation (si indiqué)" className={classesChamp} value={b.attribution ?? ""} onChange={(e) => modifierBloc(i, { attribution: e.target.value || null })} />
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {vue === "edition" && (
              <div className="flex flex-wrap gap-2 border-t border-ligne px-5 py-3">
                <button type="button" className={classesBouton.secondaire} onClick={() => setBlocs((bs) => [...bs, nouveauBloc("paragraphe")])}>
                  <Plus className="size-4" aria-hidden /> Paragraphe
                </button>
                <button type="button" className={classesBouton.secondaire} onClick={() => setBlocs((bs) => [...bs, nouveauBloc("intertitre")])}>
                  <Plus className="size-4" aria-hidden /> Intertitre
                </button>
                <p className="w-full text-xs text-texte-doux">Mise en forme : **gras** et *italique*. Les réglages fins (liens, vidéos) se font ensuite dans l&apos;éditeur d&apos;article.</p>
              </div>
            )}
          </section>

          {/* Images */}
          <section className="border border-ligne">
            <h2 className="border-b border-ligne px-5 py-3 font-titre text-sm uppercase tracking-[0.14em]">Images extraites ({resultat.images.length})</h2>
            {etat?.erreurs?.images && <p className="px-5 pt-3 text-sm font-semibold text-danger">{etat.erreurs.images}</p>}
            {resultat.images.length === 0 ? (
              <p className="px-5 py-4 text-sm text-texte-doux">Aucune image éditoriale n&apos;a été trouvée. Vous pourrez en ajouter depuis la médiathèque dans l&apos;éditeur.</p>
            ) : (
              <ul className="divide-y divide-ligne">
                {resultat.images.map((img) => {
                  const c = choix[img.id];
                  const info = infosImages.get(img.id);
                  return (
                    <li key={img.id} className={cn("grid gap-4 px-5 py-4 sm:grid-cols-[160px_minmax(0,1fr)]", !c.conserver && "opacity-60")}>
                      <div>
                        <div className="relative aspect-[4/3] bg-fond-2">
                          <Image src={img.url} alt="" fill sizes="160px" className="object-contain" />
                        </div>
                        <p className="mt-1 text-xs text-texte-doux">
                          <button type="button" className="underline" onClick={() => setPage(img.page)}>
                            Page {img.page}
                          </button>{" "}
                          · {img.largeur}×{img.hauteur}
                          {img.origine === "recadree" && " · recadrée"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <label className="flex items-center gap-2 font-semibold">
                            <input type="checkbox" checked={c.conserver} onChange={(e) => majImage(img.id, { conserver: e.target.checked })} /> Conserver
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="radio" name="image-une" checked={imageUne === img.id} disabled={!c.conserver} onChange={() => setImageUne(img.id)} />
                            <Star className="size-3.5 text-or-fonce" aria-hidden /> Image à la une
                          </label>
                          {info && (
                            <span className="text-xs text-texte-doux">
                              {LIBELLES_ROLE[info.role]} · association {info.confiance}
                              {info.section ? ` · « ${info.section.slice(0, 50)} »` : ""}
                            </span>
                          )}
                          {c.conserver && !placees.has(img.id) && imageUne !== img.id && (
                            <button type="button" className={classesBouton.lien} onClick={() => setBlocs((bs) => [...bs, nouveauBloc("image", { imageId: img.id, page: img.page })])}>
                              <ImagePlus className="size-4" aria-hidden /> Insérer dans le texte
                            </button>
                          )}
                        </div>
                        {c.conserver && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Champ label="Texte alternatif *" aide="Ce que montre l'image, pour les lecteurs d'écran.">
                              <input className={classesChamp} value={c.alt} maxLength={300} onChange={(e) => majImage(img.id, { alt: e.target.value })} />
                            </Champ>
                            <Champ label="Légende">
                              <input className={classesChamp} value={c.legende} maxLength={300} onChange={(e) => majImage(img.id, { legende: e.target.value })} />
                            </Champ>
                            <Champ label="Crédit photo">
                              <input className={classesChamp} value={c.credit} maxLength={200} onChange={(e) => majImage(img.id, { credit: e.target.value })} />
                            </Champ>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {imageUne && (
              <p className="border-t border-ligne px-5 py-3 text-sm">
                <button type="button" className={classesBouton.lien} onClick={() => setImageUne(null)}>
                  Retirer l&apos;image à la une
                </button>
              </p>
            )}
          </section>

          {/* Référencement */}
          <section className="space-y-4 border border-ligne p-5">
            <h2 className="font-titre text-sm uppercase tracking-[0.14em]">Référencement (propositions modifiables)</h2>
            <Champ label="Adresse (slug)" aide="Laissée vide, elle est déduite du titre.">
              <input className={classesChamp} value={slug} maxLength={120} onChange={(e) => setSlug(e.target.value)} />
            </Champ>
            <Champ label={`Titre SEO (${metaTitre.length}/70)`} erreur={etat?.erreurs?.metaTitre}>
              <input className={classesChamp} value={metaTitre} maxLength={70} onChange={(e) => setMetaTitre(e.target.value)} />
            </Champ>
            <Champ label={`Description SEO (${metaDescription.length}/160)`} erreur={etat?.erreurs?.metaDescription}>
              <textarea className={cn(classesChamp, "h-auto min-h-16 py-2")} value={metaDescription} maxLength={160} onChange={(e) => setMetaDescription(e.target.value)} />
            </Champ>
            <Champ label="Mots-clés" aide="Séparés par des virgules.">
              <input className={classesChamp} value={motsCles} onChange={(e) => setMotsCles(e.target.value)} />
            </Champ>
          </section>

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border border-ligne bg-fond px-5 py-4 shadow-lg">
            <button type="button" className={classesBouton.or} disabled={enCours} onClick={valider}>
              {enCours && <Loader2 className="size-4 animate-spin" aria-hidden />} Valider et créer le brouillon
            </button>
            <button type="button" className={classesBouton.secondaire} disabled={enCours} onClick={relancer}>
              <RotateCcw className="size-4" aria-hidden /> Relancer l&apos;analyse
            </button>
            <button type="button" className={classesBouton.danger} disabled={enCours} onClick={abandonner}>
              <Trash2 className="size-4" aria-hidden /> Abandonner
            </button>
            <p className="w-full text-xs text-texte-doux">L&apos;article sera créé en brouillon, non publié. Vous le finaliserez dans l&apos;éditeur avant publication.</p>
          </div>
        </div>

        {/* PDF d'origine, pour comparaison */}
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="border border-ligne">
            <div className="flex items-center justify-between gap-2 border-b border-ligne px-4 py-2">
              <h2 className="font-titre text-sm uppercase tracking-[0.14em]">PDF d&apos;origine</h2>
              <label className="flex items-center gap-2 text-sm">
                Page
                <select className={cn(classesChamp, "h-8 w-auto")} value={page} onChange={(e) => setPage(Number(e.target.value))}>
                  {Array.from({ length: nbPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <iframe key={page} title="PDF d'origine" src={`/api/admin/imports/${importId}/pdf#page=${page}&view=FitH`} className="h-[70vh] w-full bg-fond-2" />
          </div>
        </aside>
      </div>
    </div>
  );
}
