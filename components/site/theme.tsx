"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useLangue } from "@/components/i18n/contexte";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

function abonner(rappel: () => void) {
  const obs = new MutationObserver(rappel);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const lire = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function appliquerTheme(theme: Theme) {
  const html = document.documentElement;
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduit) {
    html.classList.add("transition-theme");
    setTimeout(() => html.classList.remove("transition-theme"), 350);
  }
  html.dataset.theme = theme;
  try {
    localStorage.setItem("diwa-theme", theme);
  } catch {
    /* stockage indisponible : le choix vaut pour la session */
  }
}

/** Bascule thème clair / thème sombre (le choix est mémorisé sur l'appareil). */
export function BoutonTheme({ className }: { className?: string }) {
  const { t } = useLangue();
  const theme = useSyncExternalStore(abonner, lire, () => "light" as Theme);
  const sombre = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => appliquerTheme(sombre ? "light" : "dark")}
      aria-label={sombre ? t.themeClair : t.themeSombre}
      title={sombre ? t.themeClair : t.themeSombre}
      aria-pressed={sombre}
      className={cn("grid size-10 place-items-center transition-colors hover:text-or", className)}
    >
      {sombre ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
