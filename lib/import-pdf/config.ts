// Réglages de l'importation de PDF (modifiables par variables d'environnement).
import "server-only";

const nombre = (v: string | undefined, defaut: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : defaut;
};

export const IMPORT_PDF = {
  /** Taille maximale du PDF. L'API Claude accepte 32 Mo par requête, encodage base64 compris. */
  tailleMaxMo: Math.min(nombre(process.env.IMPORT_PDF_TAILLE_MAX_MO, 20), 22),
  pagesMax: nombre(process.env.IMPORT_PDF_PAGES_MAX, 16),
  /** Durée de conservation du PDF source avant suppression automatique. */
  conservationJours: nombre(process.env.IMPORT_PDF_CONSERVATION_JOURS, 7),
  /** Nombre maximal d'images extraites par document. */
  imagesMax: 40,
  /** En dessous de cette taille (en pixels), une image est considérée comme décorative (pictogramme, puce…). */
  imagePixelsMin: 140,
  /** Au-delà, un traitement « en cours » est considéré comme interrompu et peut être relancé. */
  dureeMaxTraitementMin: 8,
  modele: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
};

export function analyseIaDisponible() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
