"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export { classesBouton, classesChamp } from "@/components/admin/styles";
import { classesBouton } from "@/components/admin/styles";

type Resultat = { ok: boolean; message: string } | null | undefined | void;

/** Bouton qui déclenche une Server Action, avec confirmation facultative et retour visuel. */
export function BoutonAction({
  action,
  confirmation,
  children,
  variante = "secondaire",
  className,
  titre,
}: {
  action: () => Promise<Resultat>;
  confirmation?: string;
  children: React.ReactNode;
  variante?: keyof typeof classesBouton;
  className?: string;
  titre?: string;
}) {
  const [enCours, demarrer] = useTransition();
  const [retour, setRetour] = useState<{ ok: boolean; message: string } | null>(null);
  const router = useRouter();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        title={titre}
        aria-label={titre}
        disabled={enCours}
        className={cn(classesBouton[variante], className)}
        onClick={() => {
          if (confirmation && !confirm(confirmation)) return;
          demarrer(async () => {
            const r = await action();
            if (r) {
              setRetour(r);
              setTimeout(() => setRetour(null), 3500);
            }
            router.refresh();
          });
        }}
      >
        {enCours && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
      <AnimatePresence>
        {retour && (
          <motion.span
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute right-0 top-full z-20 mt-1 whitespace-nowrap px-2 py-1 text-xs font-semibold text-white shadow",
              retour.ok ? "bg-succes" : "bg-danger",
            )}
          >
            {retour.message}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Message({ etat }: { etat: { ok: boolean; message: string } | null | undefined }) {
  return (
    <AnimatePresence>
      {etat?.message && (
        <motion.p
          role="status"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("border-l-4 px-3 py-2 text-sm font-medium", etat.ok ? "border-succes bg-succes/10 text-succes" : "border-danger bg-danger/10 text-danger")}
        >
          {etat.message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
