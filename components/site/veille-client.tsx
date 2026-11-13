"use client";
// Veille Média côté navigateur : bandeau « nouvelles actualités » (page ouverte) et préférences
// de notification et de son de l'appareil.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Loader2, Play, RefreshCw, Volume2 } from "lucide-react";
import { useLangue } from "@/components/i18n/contexte";
import { useValeurNavigateur } from "@/lib/hooks";
import { formatDate, lien } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { TEXTES_PREFERENCES, textesVeille } from "@/lib/veille/textes";
import { ZONES, type ZoneVeilleCle } from "@/lib/veille/defauts";
import { enregistrerReglagesSon, jouerSonNotification, lireReglagesSon, REGLAGES_SON_DEFAUT } from "@/components/pwa/son";

const INTERVALLE = 5 * 60 * 1000;

/** Page Veille ouverte : vérifie toutes les 5 minutes l'arrivée de nouvelles actualités. */
export function NouveautesVeille({ depuis }: { depuis: string | null }) {
  const { lang } = useLangue();
  const t = textesVeille(lang);
  const router = useRouter();
  const [nombre, setNombre] = useState(0);
  useEffect(() => {
    if (!depuis) return;
    let reference = depuis;
    const verifier = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await fetch(`/api/veille/nouvelles?depuis=${encodeURIComponent(reference)}`, { cache: "no-store" }).catch(() => null);
      const d = (await r?.json().catch(() => null)) as { nombre: number; plusRecente: string | null } | null;
      if (d?.nombre) {
        setNombre((n) => n + d.nombre);
        if (d.plusRecente) reference = d.plusRecente;
        window.dispatchEvent(new Event("diwa-nouvelles"));
      }
    };
    const minuteur = setInterval(verifier, INTERVALLE);
    return () => clearInterval(minuteur);
  }, [depuis]);
  if (!nombre) return null;
  return (
    <button
      type="button"
      onClick={() => {
        setNombre(0);
        router.refresh();
      }}
      className="sticky top-16 z-20 mx-auto mb-6 flex items-center gap-2 bg-or px-4 py-2 text-sm font-bold text-noir shadow-lg"
    >
      <RefreshCw className="size-4" aria-hidden /> {t.nouvelles(nombre)} — {t.actualiser}
    </button>
  );
}

type Prefs = { articles: boolean; veille: boolean; categoriesVeille: string[]; zonesVeille: string[] };
type Historique = { id: string; titre: string; source: string; date: string }[];

function base64VersUint8(base64: string) {
  const rembourrage = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + rembourrage).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

const ZONES_CHOIX = (Object.keys(ZONES) as ZoneVeilleCle[]).filter((z) => z !== "NON_PRECISE");

// Réglages sonores : stockage local, lu de façon synchrone et partagé entre composants.
const abonnerSon = (rappel: () => void) => {
  window.addEventListener("diwa-son-modifie", rappel);
  return () => window.removeEventListener("diwa-son-modifie", rappel);
};
let instantaneSon = REGLAGES_SON_DEFAUT;
const lireSon = () => {
  const r = lireReglagesSon();
  if (r.actif !== instantaneSon.actif || r.volume !== instantaneSon.volume) instantaneSon = r;
  return instantaneSon;
};

type Appareil = "androidApp" | "android" | "ios" | "ordinateur";
function detecterAppareil(): Appareil {
  const ua = navigator.userAgent;
  const installee = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return installee ? "androidApp" : "android";
  return "ordinateur";
}

/** Notifications refusées : le site ne peut pas redemander ; aide pas à pas selon l'appareil. */
function AideDeblocage({ onReessayer, occupe, encoreBloquees }: { onReessayer: () => void; occupe: boolean; encoreBloquees: boolean }) {
  const { lang } = useLangue();
  const t = TEXTES_PREFERENCES[lang];
  const appareil = useValeurNavigateur(detecterAppareil, "ordinateur");
  return (
    <div className="border-l-4 border-or bg-or-clair/40 p-5">
      <p className="flex items-center gap-2 font-bold">
        <BellOff className="size-5 text-or-fonce" aria-hidden /> {t.bloqueesTitre}
      </p>
      <p className="mt-2 text-sm">{t.bloqueesIntro}</p>
      <ol className="mt-4 space-y-3">
        {t.etapes[appareil].map((e, i) => (
          <li key={e} className="flex gap-3 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-noir text-xs font-bold text-or">{i + 1}</span>
            <span className="pt-0.5">{e}</span>
          </li>
        ))}
      </ol>
      <button type="button" disabled={occupe} onClick={onReessayer} className="mt-5 inline-flex h-11 items-center gap-2 bg-noir px-5 text-sm font-semibold text-white hover:bg-or hover:text-noir disabled:opacity-60">
        {occupe ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Bell className="size-4" aria-hidden />} {t.jaiAutorise}
      </button>
      {encoreBloquees && <p role="status" className="mt-3 text-sm font-medium text-danger">{t.toujoursBloquees}</p>}
      <p className="mt-4 text-xs text-texte-doux">{t.siEchec}</p>
    </div>
  );
}

export function PreferencesVeille({ categories }: { categories: { slug: string; nom: string; nomEn: string }[] }) {
  const { lang } = useLangue();
  const t = TEXTES_PREFERENCES[lang];
  const cle = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const support = useValeurNavigateur(() => ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "oui" : "non"), "inconnu");
  const son = useSyncExternalStore(abonnerSon, lireSon, () => REGLAGES_SON_DEFAUT);

  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [etat, setEtat] = useState<"chargement" | "inactif" | "actif" | "refuse">("chargement");
  const [prefs, setPrefs] = useState<Prefs>({ articles: true, veille: true, categoriesVeille: [], zonesVeille: [] });
  const [historique, setHistorique] = useState<Historique>([]);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [encoreBloquees, setEncoreBloquees] = useState(false);

  const chargerPrefs = async (ep: string) => {
    const [p, h] = await Promise.all([
      fetch("/api/push/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: ep }) }),
      fetch("/api/push/historique", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: ep }) }),
    ]);
    if (p.ok) setPrefs((await p.json()) as Prefs);
    if (h.ok) setHistorique((await h.json()) as Historique);
  };

  useEffect(() => {
    if (support !== "oui" || !cle) return;
    let annule = false;
    (async () => {
      if (Notification.permission === "denied") {
        if (!annule) setEtat("refuse");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (annule) return;
      if (!sub) {
        setEtat("inactif");
        return;
      }
      setEndpoint(sub.endpoint);
      setEtat("actif");
      await chargerPrefs(sub.endpoint);
    })();
    return () => {
      annule = true;
    };
  }, [support, cle]);

  // Déblocage fait dans les réglages : au retour sur la page (ou au changement d'autorisation),
  // l'abonnement est activé automatiquement, sans nouvelle manipulation.
  const activerRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (etat !== "refuse") return;
    const verifier = () => {
      if (document.visibilityState === "visible" && Notification.permission !== "denied") void activerRef.current();
    };
    document.addEventListener("visibilitychange", verifier);
    let statut: PermissionStatus | null = null;
    navigator.permissions
      ?.query({ name: "notifications" })
      .then((st) => {
        statut = st;
        st.onchange = verifier;
      })
      .catch(() => {});
    return () => {
      document.removeEventListener("visibilitychange", verifier);
      if (statut) statut.onchange = null;
    };
  }, [etat]);


  const activer = async () => {
    setOccupe(true);
    setMessage(null);
    try {
      // Demande d'autorisation : uniquement à la suite de ce clic explicite.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied" && etat === "refuse") setEncoreBloquees(true);
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
      }
      setEncoreBloquees(false);
      const reg = await navigator.serviceWorker.ready;
      let sub: PushSubscription;
      try {
        sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64VersUint8(cle!) }));
      } catch {
        setMessage({ ok: false, texte: t.erreurAbonnement });
        return;
      }
      const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...sub.toJSON(), langue: lang, veille: true }) });
      if (!r.ok) throw new Error();
      setEndpoint(sub.endpoint);
      setEtat("actif");
      await chargerPrefs(sub.endpoint);
    } catch {
      setMessage({ ok: false, texte: t.erreur });
    } finally {
      setOccupe(false);
    }
  };

  useEffect(() => {
    activerRef.current = activer;
  });

  const desactiver = async () => {
    setOccupe(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setEndpoint(null);
    setHistorique([]);
    setEtat("inactif");
    setOccupe(false);
  };

  const enregistrer = async () => {
    if (!endpoint) return;
    setOccupe(true);
    setMessage(null);
    const r = await fetch("/api/push/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, langue: lang, articles: prefs.articles, veille: prefs.veille, categories: prefs.categoriesVeille, zones: prefs.zonesVeille }),
    }).catch(() => null);
    setMessage(r?.ok ? { ok: true, texte: t.enregistre } : { ok: false, texte: t.erreur });
    setOccupe(false);
  };

  const basculer = (cleListe: "categoriesVeille" | "zonesVeille", valeur: string) =>
    setPrefs((p) => ({ ...p, [cleListe]: p[cleListe].includes(valeur) ? p[cleListe].filter((v) => v !== valeur) : [...p[cleListe], valeur] }));

  if (support === "inconnu") return <Loader2 className="size-6 animate-spin text-or" aria-label="Chargement" />;

  const case_ = "flex items-center gap-2 border border-ligne px-3 py-2 text-sm has-[:checked]:border-or has-[:checked]:bg-or-clair/50";

  return (
    <div className="space-y-10">
      {/* Notifications */}
      <section className="space-y-5">
        {support === "non" ? (
          <p className="border-l-4 border-or bg-fond-2 px-4 py-3 text-sm">{t.nonPrisEnCharge}</p>
        ) : !cle ? (
          <p className="border-l-4 border-or bg-fond-2 px-4 py-3 text-sm">{t.nonConfigure}</p>
        ) : etat === "refuse" ? (
          <AideDeblocage onReessayer={activer} occupe={occupe} encoreBloquees={encoreBloquees} />
        ) : etat === "chargement" ? (
          <Loader2 className="size-6 animate-spin text-or" aria-label="Chargement" />
        ) : etat === "inactif" ? (
          <div className="flex flex-wrap items-center gap-4 border border-ligne p-5">
            <BellOff className="size-6 text-texte-doux" aria-hidden />
            <p className="flex-1 text-sm">{t.inactif}</p>
            <button type="button" disabled={occupe} onClick={activer} className="inline-flex h-11 items-center gap-2 bg-noir px-5 text-sm font-semibold text-white hover:bg-or hover:text-noir disabled:opacity-60">
              {occupe ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Bell className="size-4" aria-hidden />} {t.activer}
            </button>
          </div>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-succes">
              <Bell className="size-4" aria-hidden /> {t.actif}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={case_}>
                <input type="checkbox" checked={prefs.articles} onChange={(e) => setPrefs((p) => ({ ...p, articles: e.target.checked }))} /> {t.articles}
              </label>
              <label className={case_}>
                <input type="checkbox" checked={prefs.veille} onChange={(e) => setPrefs((p) => ({ ...p, veille: e.target.checked }))} /> {t.veille}
              </label>
            </div>
            <fieldset disabled={!prefs.veille} className={cn("space-y-5", !prefs.veille && "opacity-50")}>
              <div>
                <legend className="font-titre text-sm uppercase tracking-[0.14em]">{t.categories}</legend>
                <p className="mb-2 text-xs text-texte-doux">{t.categoriesAide}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map((c) => (
                    <label key={c.slug} className={case_}>
                      <input type="checkbox" checked={prefs.categoriesVeille.includes(c.slug)} onChange={() => basculer("categoriesVeille", c.slug)} /> {lang === "en" ? c.nomEn : c.nom}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-titre text-sm uppercase tracking-[0.14em]">{t.zones}</p>
                <p className="mb-2 text-xs text-texte-doux">{t.zonesAide}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ZONES_CHOIX.map((z) => (
                    <label key={z} className={case_}>
                      <input type="checkbox" checked={prefs.zonesVeille.includes(z)} onChange={() => basculer("zonesVeille", z)} /> {ZONES[z][lang]}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={occupe} onClick={enregistrer} className="inline-flex h-11 items-center gap-2 bg-or px-5 text-sm font-bold text-noir hover:bg-noir hover:text-white disabled:opacity-60">
                {occupe && <Loader2 className="size-4 animate-spin" aria-hidden />} {t.enregistrer}
              </button>
              <button type="button" disabled={occupe} onClick={desactiver} className="text-sm font-semibold text-danger underline">
                {t.desactiver}
              </button>
            </div>
          </>
        )}
        {message && (
          <p role="status" className={cn("text-sm font-medium", message.ok ? "text-succes" : "text-danger")}>
            {message.texte}
          </p>
        )}
      </section>

      {/* Son dans l'application (Howler.js) */}
      <section className="space-y-4 border-t border-ligne pt-8">
        <h2 className="flex items-center gap-2 font-titre text-lg uppercase tracking-wide">
          <Volume2 className="size-5 text-or-fonce" aria-hidden /> {t.son}
        </h2>
        <p className="text-sm text-texte-doux">{t.sonAide}</p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={son.actif} onChange={(e) => enregistrerReglagesSon({ ...son, actif: e.target.checked })} /> {t.sonActif}
        </label>
        <label className={cn("block max-w-sm text-sm", !son.actif && "opacity-50")}>
          <span className="mb-1 block font-semibold">
            {t.volume} : {Math.round(son.volume * 100)} %
          </span>
          <input type="range" min={0} max={100} step={5} disabled={!son.actif} value={Math.round(son.volume * 100)} onChange={(e) => enregistrerReglagesSon({ ...son, volume: Number(e.target.value) / 100 })} className="w-full accent-[var(--or)]" />
        </label>
        <button type="button" onClick={() => void jouerSonNotification({ test: true })} className="inline-flex h-10 items-center gap-2 border border-ligne px-4 text-sm font-semibold hover:border-or">
          <Play className="size-4 text-or-fonce" aria-hidden /> {t.tester}
        </button>
      </section>

      {/* Historique */}
      {etat === "actif" && (
        <section className="space-y-3 border-t border-ligne pt-8">
          <h2 className="font-titre text-lg uppercase tracking-wide">{t.historique}</h2>
          {historique.length ? (
            <ul className="divide-y divide-ligne">
              {historique.map((h) => (
                <li key={`${h.id}-${h.date}`} className="py-2 text-sm">
                  <Link href={lien(lang, `/veille/${h.id}`)} className="font-semibold hover:text-or-fonce">
                    {h.titre}
                  </Link>
                  <span className="block text-xs text-texte-doux">
                    {h.source} · {formatDate(lang, new Date(h.date), "heure")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-texte-doux">{t.historiqueVide}</p>
          )}
        </section>
      )}
    </div>
  );
}
