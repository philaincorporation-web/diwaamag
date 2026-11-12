import { Loader2 } from "lucide-react";

// Limite de chargement propre à chaque page du back-office : les pages dépendent de la session
// et de la base, elles sont rendues à la demande pendant que ce spinner s'affiche.
export default function ChargementPage() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Loader2 className="size-8 animate-spin text-or" aria-label="Chargement" />
    </div>
  );
}
