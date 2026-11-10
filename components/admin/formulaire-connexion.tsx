"use client";

import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { connexion } from "@/lib/actions/session";

export function FormulaireConnexion({ retour }: { retour: string }) {
  const [etat, action, enCours] = useActionState(connexion, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="retour" value={retour} />
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-semibold">Adresse e-mail</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="h-11 w-full border border-ligne bg-fond px-3 outline-none focus:border-or" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold">Mot de passe</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="h-11 w-full border border-ligne bg-fond px-3 outline-none focus:border-or" />
      </div>
      {etat?.erreur && <p role="alert" className="text-sm font-medium text-danger">{etat.erreur}</p>}
      <button disabled={enCours} className="inline-flex h-11 w-full items-center justify-center gap-2 bg-noir font-titre uppercase tracking-[0.12em] text-white hover:bg-or hover:text-noir disabled:opacity-60">
        {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogIn className="size-4" aria-hidden />} Se connecter
      </button>
    </form>
  );
}
