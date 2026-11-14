"use client";
// Un encart affichant une campagne tirée selon son poids parmi celles de l'emplacement.
// Sans campagne en cours (ou si l'image ne se charge pas), la campagne interne `repli` prend la place :
// le cadre réservé n'est jamais laissé vide.

import { useState } from "react";
import { cn } from "@/lib/cn";
import { useLangue } from "@/components/i18n/contexte";
import type { PubliciteAffichee } from "@/lib/data";
import { CADRES, LARGEURS, type FormeEncart } from "@/components/ads/cadres";
import { Creation } from "@/components/ads/creation";
import { SponsoredLabel } from "@/components/ads/sponsored-label";
import { choisir, texteAlt, useImpression, useTirage } from "@/components/ads/use-pub";

export function AdBanner({
  pubs,
  forme,
  decalage = 0,
  repli = null,
  className,
}: {
  pubs: PubliciteAffichee[];
  forme: FormeEncart;
  decalage?: number;
  repli?: React.ReactNode;
  className?: string;
}) {
  const { lang } = useLangue();
  const t = useTirage();
  const [erreur, setErreur] = useState<string | null>(null);
  const tiree = t ? choisir(pubs, t.hasard, t.maintenant, decalage) : null;
  const pub = tiree && tiree.id !== erreur ? tiree : null;
  const ref = useImpression(pub ? [pub.id] : []);

  // Avant le tirage (rendu serveur, hydratation) : cadre réservé, sans contenu.
  if (!t) {
    return (
      <div aria-hidden className={className}>
        <span className="block h-[10px]" />
        <div className={cn(CADRES[forme], "mt-1.5 bg-fond-2")} />
      </div>
    );
  }
  if (!pub) return repli ? <>{repli}</> : null;

  return (
    <aside ref={ref} aria-label={texteAlt(pub, lang)} className={cn("encart", className)}>
      <div className={cn(LARGEURS[forme], "mb-1.5 flex justify-end")}>
        <SponsoredLabel lang={lang} />
      </div>
      <a
        href={`/api/pub/${pub.id}/clic`}
        target="_blank"
        rel="sponsored noopener noreferrer"
        title={pub.annonceur}
        className={cn(
          CADRES[forme],
          "group block overflow-hidden bg-fond-2 ring-1 ring-ligne transition duration-300 hover:ring-or/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-or",
        )}
      >
        <Creation pub={pub} forme={forme} lang={lang} onErreur={() => setErreur(pub.id)} />
      </a>
    </aside>
  );
}
