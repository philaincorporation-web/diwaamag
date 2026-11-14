// Cadres des encarts : l'espace est réservé avant le chargement (aspect-ratio), pour éviter tout décalage
// de mise en page (CLS). Classes Tailwind écrites en entier pour être détectées à la compilation.
// mobile < 768 px · tablette 768–1023 px · ordinateur ≥ 1024 px (config/ads.config.ts).
import type { Appareil, ConfigEmplacement } from "@/config/ads.config";

export type FormeEncart = "billboard" | "banner" | "rectangle";

export const CADRES: Record<FormeEncart, string> = {
  // 320 × 100 fluide → 728 × 180 → 970 × 250
  billboard: "mx-auto w-full aspect-[16/5] md:aspect-[728/180] lg:aspect-[970/250] lg:max-w-[970px]",
  // 320 × 100 fluide → 728 × 90
  banner: "mx-auto w-full max-w-[640px] aspect-[16/5] md:max-w-[728px] md:aspect-[728/90]",
  // 300 × 250 (fluide jusqu'à 360 px sur mobile)
  rectangle: "mx-auto w-full max-w-[360px] aspect-[6/5] md:max-w-[300px]",
};

/** Largeur seule (ligne de la mention, alignée sur le cadre). */
export const LARGEURS: Record<FormeEncart, string> = {
  billboard: "mx-auto w-full lg:max-w-[970px]",
  banner: "mx-auto w-full max-w-[640px] md:max-w-[728px]",
  rectangle: "mx-auto w-full max-w-[360px] md:max-w-[300px]",
};

/** Taille d'affichage de chaque forme, pour l'attribut `sizes` des images. */
export const TAILLES: Record<FormeEncart, string> = {
  billboard: "(min-width: 1024px) 970px, calc(100vw - 32px)",
  banner: "(min-width: 768px) 728px, calc(100vw - 32px)",
  rectangle: "(min-width: 768px) 300px, 360px",
};

/** Dimensions source (@2x) demandées aux annonceurs : [ordinateur, mobile]. */
export const SOURCES: Record<FormeEncart, { desktop: [number, number]; mobile: [number, number] }> = {
  billboard: { desktop: [1940, 500], mobile: [640, 200] },
  banner: { desktop: [1456, 180], mobile: [640, 200] },
  rectangle: { desktop: [600, 500], mobile: [600, 500] },
};

/** Masque l'encart sur les appareils pour lesquels la configuration ne prévoit aucun format. */
export function classesVisibilite(formats: ConfigEmplacement["formats"]) {
  const a = (x: Appareil) => Boolean(formats[x]);
  if (a("mobile")) return "";
  if (a("tablet")) return "hidden md:block";
  if (a("desktop")) return "hidden lg:block";
  return "hidden";
}
