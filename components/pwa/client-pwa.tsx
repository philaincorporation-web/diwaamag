"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellRing, Download, Share, SquarePlus, X } from "lucide-react";
import { useValeurNavigateur } from "@/lib/hooks";
import { useLangue } from "@/components/i18n/contexte";
import { jouerSonNotification } from "@/components/pwa/son";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function lire(cle: string) {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrire(cle: string, valeur: string) {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    /* stockage indisponible */
  }
}

/** Enregistre le service worker et propose l'installation (Android : invite native ; iOS : bandeau d'aide). */
export function ClientPwa() {
  const { t } = useLangue();
  const [invite, setInvite] = useState<BeforeInstallPromptEvent | null>(null);
  const [aideIos, setAideIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const autonome = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (autonome || lire("diwa-install-ferme")) return;

    const surInvite = (e: Event) => {
      e.preventDefault();
      setInvite(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", surInvite);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (ios) t = setTimeout(() => setAideIos(true), 8000);
    return () => {
      window.removeEventListener("beforeinstallprompt", surInvite);
      if (t) clearTimeout(t);
    };
  }, []);

  // Application ouverte : une notification reçue (message du service worker) ou de nouvelles
  // actualités détectées par la page déclenchent la signature sonore, selon les réglages du lecteur.
  useEffect(() => {
    const surMessage = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === "diwa-notification") void jouerSonNotification();
    };
    const surNouvelles = () => void jouerSonNotification();
    navigator.serviceWorker?.addEventListener("message", surMessage);
    window.addEventListener("diwa-nouvelles", surNouvelles);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", surMessage);
      window.removeEventListener("diwa-nouvelles", surNouvelles);
    };
  }, []);

  const fermer = () => {
    ecrire("diwa-install-ferme", "1");
    setInvite(null);
    setAideIos(false);
  };

  const installer = async () => {
    if (!invite) return;
    await invite.prompt();
    await invite.userChoice;
    fermer();
  };

  const visible = Boolean(invite) || aideIos;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label={t.installer}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md border-t-4 border-or bg-noir p-4 text-white shadow-2xl"
        >
          <button type="button" onClick={fermer} aria-label={t.fermer} className="absolute right-2 top-2 grid size-8 place-items-center text-white/60 hover:text-white">
            <X className="size-4" />
          </button>
          <p className="pr-8 font-titre text-lg uppercase">{t.installer}</p>
          {invite ? (
            <>
              <p className="mt-1 text-sm text-white/75">{t.installerTexte}</p>
              <button type="button" onClick={installer} className="mt-3 inline-flex h-10 items-center gap-2 bg-or px-4 font-titre text-sm font-semibold uppercase tracking-[0.12em] text-noir hover:bg-white">
                <Download className="size-4" aria-hidden /> {t.installerBouton}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              {t.installerIos1} <Share className="inline size-4 align-text-bottom text-or" aria-label={t.installerIos2} />{" "}
              <strong>{t.installerIos2}</strong>, {t.installerIos3} <SquarePlus className="inline size-4 align-text-bottom text-or" aria-hidden />{" "}
              <strong>{t.installerIos4}</strong>.
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function base64VersUint8(base64: string) {
  const remplissage = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + remplissage).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(b64);
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
}

/** Bouton d'abonnement aux notifications des nouveaux articles. */
export function BoutonNotifications() {
  const { t, lang } = useLangue();
  const cle = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const disponible = useValeurNavigateur(
    () => Boolean(cle) && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    false,
  );
  const [etat, setEtat] = useState<"inconnu" | "inactif" | "actif" | "refuse">("inconnu");

  useEffect(() => {
    if (!disponible) return;
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (Notification.permission === "denied") return setEtat("refuse");
      const sub = await reg?.pushManager.getSubscription();
      setEtat(sub ? "actif" : "inactif");
    });
  }, [disponible]);

  if (!disponible || etat === "inconnu") return null;

  const activer = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setEtat("refuse");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64VersUint8(cle!) });
    await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...sub.toJSON(), langue: lang }) });
    setEtat("actif");
  };

  const desactiver = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setEtat("inactif");
  };

  if (etat === "refuse") {
    return (
      <a href={`/${lang}/veille/preferences`} className="text-xs text-white/60 underline hover:text-or">
        {t.notifsBloquees}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={etat === "actif" ? desactiver : activer}
      className="inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:border-or hover:text-or"
    >
      {etat === "actif" ? <BellRing className="size-4" aria-hidden /> : <Bell className="size-4" aria-hidden />}
      {etat === "actif" ? t.notifActives : t.activerNotifs}
    </button>
  );
}
