// Images : seules les adresses locales et Cloudinary passent par l'optimiseur de Next.js
// (liste blanche images.remotePatterns de next.config.ts). Une autre adresse (image copiée depuis
// un autre site) est affichée telle quelle au lieu de faire échouer toute la page.
const HOTES_OPTIMISES = ["res.cloudinary.com"];

export function imageOptimisable(src: string | null | undefined) {
  if (!src) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && HOTES_OPTIMISES.includes(u.hostname);
  } catch {
    return false;
  }
}
