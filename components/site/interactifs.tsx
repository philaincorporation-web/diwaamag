"use client";

import Script from "next/script";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Flag, Link2, Loader2, Send, Share2 } from "lucide-react";
import { useFormulaire, useValeurNavigateur } from "@/lib/hooks";
import { useLangue } from "@/components/i18n/contexte";
import { IconeMarque } from "@/components/site/reseaux";
import { envoyerContact, inscrireNewsletter, publierCommentaire, signalerCommentaire, type EtatFormulaire } from "@/lib/actions/publiques";
import { lien } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const CLE_TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function Turnstile() {
  const { lang } = useLangue();
  if (!CLE_TURNSTILE) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={CLE_TURNSTILE} data-language={lang} />
    </>
  );
}

/** Champ invisible anti-robots + langue de l'interface (pour les messages du serveur). */
function ChampsCaches() {
  const { lang } = useLangue();
  return (
    <>
      <input type="hidden" name="langue" value={lang} />
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  );
}

function Retour({ etat }: { etat: EtatFormulaire }) {
  return (
    <AnimatePresence>
      {etat?.message && (
        <motion.p role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-3 text-sm font-medium", etat.ok ? "text-succes" : "text-danger")}>
          {etat.message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function FormulaireNewsletter({ sombre = false, compact = false }: { sombre?: boolean; compact?: boolean }) {
  const { t } = useLangue();
  const { etat, onSubmit, enCours, ref } = useFormulaire(inscrireNewsletter, { viderSiSucces: true });
  const id = `nl-${compact ? "c" : "l"}`;
  return (
    <form ref={ref} onSubmit={onSubmit} className="relative">
      <ChampsCaches />
      <div className={cn("flex gap-2", compact ? "flex-col" : "flex-col sm:flex-row")}>
        <label className="sr-only" htmlFor={id}>{t.email}</label>
        <input
          id={id}
          type="email"
          name="email"
          required
          placeholder={t.votreEmail}
          autoComplete="email"
          className={cn(
            "h-12 min-w-0 flex-1 border px-4 text-sm outline-none transition-colors focus:border-or",
            sombre ? "border-white/20 bg-white/10 text-white placeholder:text-white/50" : "border-noir/20 bg-white text-noir placeholder:text-noir/50",
          )}
        />
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={enCours}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 px-6 font-titre text-sm font-semibold uppercase tracking-[0.12em] transition-colors disabled:opacity-60",
            sombre ? "bg-or text-noir hover:bg-white" : "bg-noir text-white hover:bg-white hover:text-noir",
          )}
        >
          {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {t.sInscrire}
        </motion.button>
      </div>
      <Retour etat={etat} />
    </form>
  );
}

export function BoutonsPartage({ titre, url }: { titre: string; url: string }) {
  const { t } = useLangue();
  const [copie, setCopie] = useState(false);
  const natif = useValeurNavigateur(() => "share" in navigator, false);
  const ti = encodeURIComponent(titre);
  const u = encodeURIComponent(url);
  const liens = [
    { nom: "whatsapp" as const, libelle: "WhatsApp", href: `https://wa.me/?text=${ti}%20${u}`, couleur: "hover:bg-[#25D366]" },
    { nom: "linkedin" as const, libelle: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, couleur: "hover:bg-[#0A66C2]" },
    { nom: "facebook" as const, libelle: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, couleur: "hover:bg-[#1877F2]" },
    { nom: "x" as const, libelle: "X", href: `https://x.com/intent/post?text=${ti}&url=${u}`, couleur: "hover:bg-black" },
  ];
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-titre text-xs uppercase tracking-[0.16em] text-texte-doux">{t.partager}</span>
      {liens.map((l) => (
        <motion.a
          key={l.nom}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.92 }}
          href={l.href}
          target="_blank"
          rel="noopener"
          aria-label={`${t.partagerSur} ${l.libelle}`}
          className={cn("grid size-9 place-items-center bg-noir text-white transition-colors", l.couleur)}
        >
          <IconeMarque nom={l.nom} />
        </motion.a>
      ))}
      <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={copier} aria-label={t.copierLien} className="grid size-9 place-items-center border border-ligne bg-fond transition-colors hover:border-or">
        {copie ? <Check className="size-4 text-succes" /> : <Link2 className="size-4" />}
      </motion.button>
      {natif && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => navigator.share({ title: titre, url }).catch(() => {})}
          aria-label={t.partagerTelephone}
          className="grid size-9 place-items-center border border-ligne bg-fond transition-colors hover:border-or"
        >
          <Share2 className="size-4" />
        </motion.button>
      )}
      <span role="status" className="sr-only">{copie ? t.lienCopie : ""}</span>
    </div>
  );
}

function Champ({
  label,
  name,
  erreur,
  type = "text",
  required,
  multiligne,
  aide,
  autoComplete,
}: {
  label: string;
  name: string;
  erreur?: string;
  type?: string;
  required?: boolean;
  multiligne?: boolean;
  aide?: string;
  autoComplete?: string;
}) {
  const id = `champ-${name}`;
  const classes = cn("w-full border bg-fond px-3 py-2.5 text-sm outline-none transition-colors focus:border-or", erreur ? "border-danger" : "border-ligne");
  const decrit = erreur ? `${id}-e` : aide ? `${id}-a` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label} {required && <span className="text-danger" aria-hidden>*</span>}
      </label>
      {multiligne ? (
        <textarea id={id} name={name} required={required} rows={5} className={classes} aria-invalid={!!erreur} aria-describedby={decrit} />
      ) : (
        <input id={id} name={name} type={type} required={required} autoComplete={autoComplete} className={classes} aria-invalid={!!erreur} aria-describedby={decrit} />
      )}
      {aide && !erreur && <p id={`${id}-a`} className="mt-1 text-xs text-texte-doux">{aide}</p>}
      {erreur && <p id={`${id}-e`} className="mt-1 text-xs font-medium text-danger">{erreur}</p>}
    </div>
  );
}

export function FormulaireCommentaire({ articleId, parentId, onFini }: { articleId: string; parentId?: string; onFini?: () => void }) {
  const { lang, t } = useLangue();
  const { etat, onSubmit, enCours, ref } = useFormulaire(publierCommentaire, {
    viderSiSucces: true,
    apresSucces: () => {
      if (onFini) setTimeout(onFini, 2500);
    },
  });
  return (
    <form ref={ref} onSubmit={onSubmit} className="relative space-y-4">
      <ChampsCaches />
      <input type="hidden" name="articleId" value={articleId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t.nom} name="nom" required erreur={etat?.erreurs?.nom} autoComplete="name" />
        <Champ label={t.email} name="email" type="email" required erreur={etat?.erreurs?.email} autoComplete="email" aide={t.emailAide} />
      </div>
      <Champ label={t.message} name="message" required multiligne erreur={etat?.erreurs?.message} />
      <Champ label={t.lienFacultatif} name="lien" type="url" erreur={etat?.erreurs?.lien} aide={t.lienAide} />
      <label className="flex items-start gap-2 text-xs text-texte-doux">
        <input type="checkbox" name="consentement" required className="mt-0.5 accent-[var(--or)]" />
        <span>
          {t.consentement1}{" "}
          <a href={lien(lang, "/confidentialite")} className="underline">{t.politiqueConfidentialite}</a>.
        </span>
      </label>
      {etat?.erreurs?.consentement && <p className="text-xs font-medium text-danger">{etat.erreurs.consentement}</p>}
      <Turnstile />
      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={enCours}
        className="inline-flex h-11 items-center gap-2 bg-noir px-6 font-titre text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-or hover:text-noir disabled:opacity-60"
      >
        {enCours && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {parentId ? t.repondre : t.publierCommentaire}
      </motion.button>
      <Retour etat={etat} />
    </form>
  );
}

export function BoutonRepondre({ articleId, parentId, nom }: { articleId: string; parentId: string; nom: string }) {
  const { t } = useLangue();
  const [ouvert, setOuvert] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOuvert((o) => !o)} className="text-xs font-semibold uppercase tracking-[0.12em] text-or-fonce hover:text-encre" aria-expanded={ouvert}>
        {ouvert ? t.annuler : t.repondre}
      </button>
      <AnimatePresence>
        {ouvert && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-4 border-l-2 border-or pl-4">
              <p className="mb-3 text-sm text-texte-doux">{t.reponseA} {nom}</p>
              <FormulaireCommentaire articleId={articleId} parentId={parentId} onFini={() => setOuvert(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BoutonSignaler({ commentaireId }: { commentaireId: string }) {
  const { t } = useLangue();
  const [fait, setFait] = useState(false);
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={fait || enCours}
      onClick={() => {
        if (!confirm(t.confirmerSignalement)) return;
        demarrer(async () => {
          await signalerCommentaire(commentaireId);
          setFait(true);
        });
      }}
      className="inline-flex items-center gap-1 text-xs text-texte-doux hover:text-danger disabled:opacity-60"
    >
      <Flag className="size-3" aria-hidden /> {fait ? t.signale : t.signaler}
    </button>
  );
}

export function FormulaireContact() {
  const { t } = useLangue();
  const { etat, onSubmit, enCours, ref } = useFormulaire(envoyerContact, { viderSiSucces: true });
  return (
    <form ref={ref} onSubmit={onSubmit} className="relative space-y-4">
      <ChampsCaches />
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t.nom} name="nom" required erreur={etat?.erreurs?.nom} autoComplete="name" />
        <Champ label={t.email} name="email" type="email" required erreur={etat?.erreurs?.email} autoComplete="email" />
      </div>
      <Champ label={t.sujet} name="sujet" required erreur={etat?.erreurs?.sujet} />
      <Champ label={t.messageContact} name="message" required multiligne erreur={etat?.erreurs?.message} />
      <Turnstile />
      <button disabled={enCours} className="inline-flex h-11 items-center gap-2 bg-noir px-6 font-titre text-sm font-semibold uppercase tracking-[0.12em] text-white hover:bg-or hover:text-noir disabled:opacity-60">
        {enCours && <Loader2 className="size-4 animate-spin" aria-hidden />} {t.envoyer}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

/** Compte une lecture (une fois par article et par session). */
export function CompteurVues({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const cle = `vu:${slug}`;
      if (sessionStorage.getItem(cle)) return;
      sessionStorage.setItem(cle, "1");
    } catch {
      /* stockage indisponible */
    }
    navigator.sendBeacon?.(`/api/articles/${slug}/vue`);
  }, [slug]);
  return null;
}

/** Barre de progression de lecture. */
export function ProgressionLecture() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const maj = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? Math.min(1, h.scrollTop / max) : 0);
    };
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    return () => window.removeEventListener("scroll", maj);
  }, []);
  return <div aria-hidden className="fixed left-0 top-0 z-50 h-1 bg-or" style={{ width: `${p * 100}%` }} />;
}
