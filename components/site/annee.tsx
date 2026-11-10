"use client";

import { useValeurNavigateur } from "@/lib/hooks";

/** Année courante calculée dans le navigateur (évite une lecture de l'horloge pendant le pré-rendu). */
export function AnneeCourante() {
  const annee = useValeurNavigateur(() => new Date().getFullYear(), null);
  return <span>{annee ?? ""}</span>;
}
