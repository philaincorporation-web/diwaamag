"use client";

import { startTransition, useActionState, useRef, useSyncExternalStore, type FormEvent } from "react";

const sansAbonnement = () => () => {};

/** Lit une valeur propre au navigateur sans décalage d'hydratation (valeur serveur fournie). */
export function useValeurNavigateur<T>(lire: () => T, valeurServeur: T): T {
  return useSyncExternalStore(sansAbonnement, lire, () => valeurServeur);
}

/** Vrai une fois le composant hydraté côté navigateur. */
export function useMonte() {
  return useValeurNavigateur(() => true, false);
}

type EtatAction = { ok: boolean; message: string } | null;

/**
 * Formulaire branché sur une Server Action.
 * Contrairement à <form action={…}>, la saisie n'est PAS effacée quand le serveur renvoie une erreur :
 * le formulaire n'est réinitialisé qu'en cas de succès (option `viderSiSucces`).
 */
export function useFormulaire<E extends EtatAction>(
  action: (etat: E | null, formData: FormData) => Promise<E | null>,
  { viderSiSucces = false, apresSucces }: { viderSiSucces?: boolean; apresSucces?: (etat: E) => void } = {},
) {
  const ref = useRef<HTMLFormElement>(null);
  const [etat, executer, enCours] = useActionState(async (precedent: E | null, formData: FormData) => {
    const r = await action(precedent, formData);
    if (r?.ok) {
      if (viderSiSucces) ref.current?.reset();
      apresSucces?.(r);
    }
    return r;
  }, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => executer(fd));
  };
  return { etat, onSubmit, enCours, ref };
}
