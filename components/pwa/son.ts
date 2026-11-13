// Signature sonore de DIWA Magazine, jouée avec Howler.js quand l'application est ouverte.
// Réglages propres à l'appareil (stockage local) : activation et volume (discret par défaut).
// Jamais de lecture automatique avant une interaction de l'utilisateur avec la page.
// Ce son ne concerne pas les notifications système : leur son dépend du navigateur et de l'appareil.

export type ReglagesSon = { actif: boolean; volume: number };
export const REGLAGES_SON_DEFAUT: ReglagesSon = { actif: true, volume: 0.35 };
const CLE = "diwa-son";

export function lireReglagesSon(): ReglagesSon {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) ?? "null") as Partial<ReglagesSon> | null;
    if (!brut) return REGLAGES_SON_DEFAUT;
    return {
      actif: typeof brut.actif === "boolean" ? brut.actif : REGLAGES_SON_DEFAUT.actif,
      volume: typeof brut.volume === "number" ? Math.min(1, Math.max(0, brut.volume)) : REGLAGES_SON_DEFAUT.volume,
    };
  } catch {
    return REGLAGES_SON_DEFAUT;
  }
}

export function enregistrerReglagesSon(r: ReglagesSon) {
  try {
    localStorage.setItem(CLE, JSON.stringify(r));
  } catch {
    /* stockage indisponible : réglage limité à la session */
  }
  window.dispatchEvent(new Event("diwa-son-modifie"));
}

type Howl = import("howler").Howl;
let son: Promise<Howl> | null = null;

/** Chargement différé de Howler et du fichier (léger : environ 6 Ko). */
function charger() {
  son ??= import("howler").then(({ Howl }) => new Howl({ src: ["/sons/notification.mp3"], preload: true }));
  return son;
}

/**
 * Joue la sonnerie. `test` : depuis le bouton « Tester » (joue même si le son est désactivé).
 * Renvoie false si la lecture n'est pas permise (son désactivé ou aucune interaction préalable).
 */
export async function jouerSonNotification({ test = false }: { test?: boolean } = {}) {
  const r = lireReglagesSon();
  if (!test && !r.actif) return false;
  // Les navigateurs bloquent l'audio sans geste préalable de l'utilisateur sur la page.
  const actif = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (!test && actif && !actif.hasBeenActive) return false;
  try {
    const h = await charger();
    h.volume(r.volume);
    h.play();
    return true;
  } catch {
    return false;
  }
}
