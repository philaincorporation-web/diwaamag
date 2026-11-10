import { notFound } from "next/navigation";

/** Toute URL publique inconnue affiche la page 404 dans la bonne langue. */
export default function PageInconnue() {
  notFound();
}
