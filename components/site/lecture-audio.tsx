"use client";
// « Écouter l'article » : lecture à voix haute par la synthèse vocale du navigateur (gratuite,
// sans service externe). Le texte est lu phrase par phrase (les longues lectures sont coupées
// par certains navigateurs). Masqué si le navigateur ne la prend pas en charge.

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, Square } from "lucide-react";
import { useValeurNavigateur } from "@/lib/hooks";
import { useLangue } from "@/components/i18n/contexte";

function decouper(texte: string) {
  const phrases = texte.replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]+["»”)]?\s*|[^.!?…]+$/g) ?? [texte];
  const morceaux: string[] = [];
  let courant = "";
  for (const p of phrases) {
    if ((courant + p).length > 220 && courant) {
      morceaux.push(courant.trim());
      courant = "";
    }
    courant += p;
  }
  if (courant.trim()) morceaux.push(courant.trim());
  return morceaux;
}

export function LectureAudio({ texte }: { texte: string }) {
  const { lang, t } = useLangue();
  const disponible = useValeurNavigateur(() => typeof window !== "undefined" && "speechSynthesis" in window, false);
  const [etat, setEtat] = useState<"arret" | "lecture" | "pause">("arret");
  const file = useRef<string[]>([]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!disponible) return null;

  const lireSuivant = () => {
    const morceau = file.current.shift();
    if (!morceau) {
      setEtat("arret");
      return;
    }
    const u = new SpeechSynthesisUtterance(morceau);
    u.lang = lang === "en" ? "en-GB" : "fr-FR";
    const voix = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
    if (voix) u.voice = voix;
    u.rate = 1;
    u.onend = lireSuivant;
    u.onerror = () => setEtat("arret");
    window.speechSynthesis.speak(u);
  };

  const demarrer = () => {
    window.speechSynthesis.cancel();
    file.current = decouper(texte);
    setEtat("lecture");
    lireSuivant();
  };
  const pause = () => {
    window.speechSynthesis.pause();
    setEtat("pause");
  };
  const reprendre = () => {
    window.speechSynthesis.resume();
    setEtat("lecture");
  };
  const arreter = () => {
    file.current = [];
    window.speechSynthesis.cancel();
    setEtat("arret");
  };

  const bouton = "inline-flex h-9 items-center gap-2 border border-ligne px-3 text-sm font-semibold transition-colors hover:border-or hover:text-or-fonce";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      {etat === "arret" ? (
        <button type="button" onClick={demarrer} className={bouton}>
          <Headphones className="size-4 text-or-fonce" aria-hidden /> {t.ecouter}
        </button>
      ) : (
        <>
          {etat === "lecture" ? (
            <button type="button" onClick={pause} className={bouton}>
              <Pause className="size-4 text-or-fonce" aria-hidden /> {t.pause}
            </button>
          ) : (
            <button type="button" onClick={reprendre} className={bouton}>
              <Play className="size-4 text-or-fonce" aria-hidden /> {t.reprendre}
            </button>
          )}
          <button type="button" onClick={arreter} className={bouton}>
            <Square className="size-4" aria-hidden /> {t.arreter}
          </button>
        </>
      )}
    </div>
  );
}
