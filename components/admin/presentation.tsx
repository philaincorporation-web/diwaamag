// Éléments de présentation du back-office (composants serveur).
import { cn } from "@/lib/cn";
import { LIBELLES_STATUT } from "@/lib/format";

export function EnTeteAdmin({ titre, description, actions }: { titre: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-ligne pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-titre text-3xl uppercase tracking-wide">{titre}</h1>
        {description && <p className="mt-1 text-sm text-texte-doux">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Carte({ titre, children, className, actions }: { titre?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("border border-ligne bg-fond", className)}>
      {titre && (
        <div className="flex items-center justify-between border-b border-ligne px-5 py-3">
          <h2 className="font-titre text-sm uppercase tracking-[0.14em]">{titre}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const COULEURS_STATUT: Record<string, string> = {
  BROUILLON: "bg-gray-100 text-gray-700",
  PROGRAMME: "bg-blue-50 text-blue-700",
  PUBLIE: "bg-green-50 text-green-700",
  ARCHIVE: "bg-amber-50 text-amber-800",
  CORBEILLE: "bg-red-50 text-red-700",
  EN_ATTENTE: "bg-amber-50 text-amber-800",
  APPROUVE: "bg-green-50 text-green-700",
  REJETE: "bg-gray-100 text-gray-700",
  SIGNALE: "bg-red-50 text-red-700",
};

const LIBELLES_COMMENTAIRE: Record<string, string> = { EN_ATTENTE: "En attente", APPROUVE: "Approuvé", REJETE: "Rejeté", SIGNALE: "Signalé" };

export function BadgeStatut({ statut }: { statut: string }) {
  const libelle = (LIBELLES_STATUT as Record<string, string>)[statut] ?? LIBELLES_COMMENTAIRE[statut] ?? statut;
  return <span className={cn("inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", COULEURS_STATUT[statut])}>{libelle}</span>;
}

export function Vide({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-texte-doux">{children}</p>;
}
