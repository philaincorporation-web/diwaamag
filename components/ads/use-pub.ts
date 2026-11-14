"use client";
// Outils partagés des encarts (navigateur) : tirage fixé pour la page, choix pondéré des campagnes,
// mesure des affichages (50 % visibles pendant au moins 1 s), préférence « réduire les animations ».

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { PubliciteAffichee } from "@/lib/data";

/** Tirage fixé pour toute la page (même campagne entre deux rendus), calculé côté navigateur. */
let tirage: { hasard: number; maintenant: number } | null = null;
const lireTirage = () => (tirage ??= { hasard: Math.random(), maintenant: Date.now() });
const sansAbonnement = () => () => {};

/** null pendant le rendu serveur et l'hydratation, puis le tirage de la page. */
export function useTirage() {
  return useSyncExternalStore(sansAbonnement, lireTirage, () => null);
}

export const enCours = (p: PubliciteAffichee, maintenant: number) => (!p.debut || p.debut <= maintenant) && (!p.fin || p.fin > maintenant);

/** Une campagne tirée selon son poids. `decalage` différencie plusieurs encarts du même emplacement. */
export function choisir(pubs: PubliciteAffichee[], hasard: number, maintenant: number, decalage = 0) {
  const valides = pubs.filter((p) => enCours(p, maintenant));
  if (!valides.length) return null;
  const total = valides.reduce((s, p) => s + p.poids, 0);
  let cible = ((hasard + decalage * 0.618) % 1) * total;
  for (const p of valides) {
    cible -= p.poids;
    if (cible < 0) return p;
  }
  return valides[0];
}

/** Jusqu'à `n` campagnes distinctes, la première tirée selon son poids, les suivantes dans l'ordre. */
export function choisirPlusieurs(pubs: PubliciteAffichee[], hasard: number, maintenant: number, n: number) {
  const valides = pubs.filter((p) => enCours(p, maintenant));
  const premiere = choisir(valides, hasard, maintenant);
  if (!premiere) return [];
  const i = valides.indexOf(premiere);
  return [...valides.slice(i), ...valides.slice(0, i)].slice(0, n);
}

/**
 * Compte un affichage quand l'élément est visible à 50 % au moins pendant 1 seconde.
 * Chaque campagne n'est comptée qu'une fois par encart affiché (un carrousel qui repasse ne recompte pas).
 */
export function useImpression<T extends HTMLElement = HTMLDivElement>(ids: string[]) {
  const ref = useRef<T>(null);
  const comptes = useRef(new Set<string>());
  const cle = ids.join(",");
  useEffect(() => {
    const el = ref.current;
    const aCompter = cle ? cle.split(",").filter((id) => !comptes.current.has(id)) : [];
    if (!el || !aCompter.length) return;
    let minuteur: number | undefined;
    const obs = new IntersectionObserver(
      ([entree]) => {
        if (entree?.isIntersecting) {
          minuteur ??= window.setTimeout(() => {
            for (const id of aCompter) {
              comptes.current.add(id);
              navigator.sendBeacon?.(`/api/pub/${id}/vue`);
            }
            obs.disconnect();
          }, 1000);
        } else {
          window.clearTimeout(minuteur);
          minuteur = undefined;
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      window.clearTimeout(minuteur);
    };
  }, [cle]);
  return ref;
}

const requeteMouvement = "(prefers-reduced-motion: reduce)";
function abonnerMouvement(rappel: () => void) {
  const mq = window.matchMedia(requeteMouvement);
  mq.addEventListener("change", rappel);
  return () => mq.removeEventListener("change", rappel);
}

/** true si l'utilisateur a demandé de réduire les animations (rotation automatique désactivée). */
export function useMouvementReduit() {
  return useSyncExternalStore(abonnerMouvement, () => window.matchMedia(requeteMouvement).matches, () => true);
}

/** Texte alternatif dans la langue de la page (anglais si fourni, sinon français). */
export const texteAlt = (p: PubliciteAffichee, lang: "fr" | "en") => (lang === "en" && p.imageAltEn ? p.imageAltEn : p.imageAlt);
