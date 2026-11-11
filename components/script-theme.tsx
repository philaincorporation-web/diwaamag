"use client";
// Applique le thème (enregistré, sinon celui du système) avant l'affichage, sans flash.
// - Rendu serveur : script exécutable inséré dans le HTML, lancé avant la première peinture.
// - Rendu client (ex. passage FR ↔ EN qui reconstruit la racine) : React n'exécute jamais un <script>
//   créé côté client et l'affiche en erreur ; on le marque donc « text/plain » (inerte) et on
//   réapplique le thème dans un effet de mise en page, car React efface les attributs de <html>.
import { useLayoutEffect } from "react";

function appliquerTheme() {
  try {
    let t = localStorage.getItem("diwa-theme");
    if (t !== "light" && t !== "dark") t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = t;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
}

const code = `(${appliquerTheme.toString()})();`;

export function ScriptTheme() {
  useLayoutEffect(appliquerTheme, []);
  return (
    <script
      suppressHydrationWarning
      type={typeof window === "undefined" ? undefined : "text/plain"}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
