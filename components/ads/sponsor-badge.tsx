// Mention « présentée par » / « offerte par » + logo du sponsor (HP-03, HP-06, HP-08, HP-09, RUB-01).
// Prêt pour la phase 2 : à placer dans l'en-tête du bloc parrainé. Logo 120 × 40 (100 × 34 sur mobile).
import Image from "next/image";
import { cn } from "@/lib/cn";
import { dico, type Langue } from "@/lib/i18n";
import { imageOptimisable } from "@/lib/images";

export type Sponsor = { nom: string; logoUrl?: string | null; lien?: string | null };

export function SponsorBadge({
  sponsor,
  wording = "presentee",
  lang,
  sombre = false,
  className,
}: {
  sponsor: Sponsor;
  wording?: "presentee" | "offerte";
  lang: Langue;
  sombre?: boolean;
  className?: string;
}) {
  const t = dico(lang);
  const contenu = sponsor.logoUrl ? (
    <Image
      src={sponsor.logoUrl}
      unoptimized={!imageOptimisable(sponsor.logoUrl)}
      alt={sponsor.nom}
      width={240}
      height={80}
      sizes="120px"
      className="h-[34px] w-auto max-w-[100px] object-contain md:h-10 md:max-w-[120px]"
    />
  ) : (
    <strong className="font-semibold">{sponsor.nom}</strong>
  );
  return (
    <span className={cn("encart inline-flex items-center gap-2 text-xs", sombre ? "text-white/70" : "text-texte-doux", className)}>
      <span className="font-titre uppercase tracking-[0.16em]">{wording === "presentee" ? t.presenteePar : t.offertePar}</span>
      {sponsor.lien ? (
        <a href={sponsor.lien} target="_blank" rel="sponsored noopener noreferrer" className="inline-flex items-center hover:opacity-80">
          {contenu}
        </a>
      ) : (
        contenu
      )}
    </span>
  );
}
