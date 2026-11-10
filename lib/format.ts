const fuseau = "Africa/Libreville";

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: fuseau });
const formatDateCourte = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: fuseau });
const formatDateHeure = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: fuseau,
});
const formatMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: fuseau });

export const dateLongue = (d: Date | string | null | undefined) => (d ? formatDate.format(new Date(d)) : "");
export const dateCourte = (d: Date | string | null | undefined) => (d ? formatDateCourte.format(new Date(d)) : "");
export const dateHeure = (d: Date | string | null | undefined) => (d ? formatDateHeure.format(new Date(d)) : "");
export const moisAnnee = (d: Date | string | null | undefined) => {
  if (!d) return "";
  const s = formatMois.format(new Date(d));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const LIBELLES_TYPE = {
  ACTUALITE: "Actualité",
  INTERVIEW: "Interview",
  DOSSIER: "Dossier",
  VIDEO: "Vidéo",
} as const;

export const LIBELLES_STATUT = {
  BROUILLON: "Brouillon",
  PROGRAMME: "Programmé",
  PUBLIE: "Publié",
  ARCHIVE: "Archivé",
  CORBEILLE: "Corbeille",
} as const;

export function siteUrl(chemin = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${chemin}`;
}
