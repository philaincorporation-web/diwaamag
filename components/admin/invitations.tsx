"use client";
// Renvoi d'une invitation administrateur. Le résultat reste affiché : si l'e-mail n'a pas pu partir,
// le super-administrateur peut copier le mot de passe provisoire pour le transmettre lui-même.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Loader2, Send, X } from "lucide-react";
import { renvoyerInvitation, type Etat } from "@/lib/actions/gestion";
import { classesBouton } from "@/components/admin/styles";
import { cn } from "@/lib/cn";

export function BoutonInvitation({ id, nom }: { id: string; nom: string }) {
  const [enCours, demarrer] = useTransition();
  const [resultat, setResultat] = useState<Etat>(null);
  const [copie, setCopie] = useState(false);
  const router = useRouter();
  const motDePasse = resultat && !resultat.ok ? resultat.message.match(/transmettre vous-même : (\S+)$/)?.[1] : undefined;
  return (
    <span className="inline-flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={enCours}
        className={cn(classesBouton.secondaire, "h-8 px-3")}
        onClick={() => {
          if (!confirm(`Envoyer une nouvelle invitation à ${nom} ? Un nouveau mot de passe provisoire remplacera l'actuel.`)) return;
          setCopie(false);
          demarrer(async () => {
            setResultat(await renvoyerInvitation(id));
            router.refresh();
          });
        }}
      >
        {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Renvoyer l&apos;invitation
      </button>
      {resultat && (
        <span role="status" className={cn("relative max-w-md border px-3 py-2 pr-8 text-left text-xs", resultat.ok ? "border-succes/40 bg-succes/5 text-succes" : "border-or bg-or-clair/50 text-texte")}>
          {resultat.message}
          {motDePasse && (
            <button
              type="button"
              className="mt-2 flex items-center gap-1 font-semibold text-or-fonce"
              onClick={() => navigator.clipboard.writeText(motDePasse).then(() => setCopie(true))}
            >
              <Copy className="size-3.5" aria-hidden /> {copie ? "Copié" : "Copier le mot de passe"}
            </button>
          )}
          <button type="button" aria-label="Fermer" className="absolute right-1 top-1 p-1" onClick={() => setResultat(null)}>
            <X className="size-3.5" />
          </button>
        </span>
      )}
    </span>
  );
}
