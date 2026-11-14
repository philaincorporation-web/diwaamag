// Mention au-dessus de chaque encart : « Publicité », « Contenu partenaire » ou annonce interne du magazine.
// Petites capitales, typographie des titres, or foncé de la charte (contraste AA en thème clair et sombre).
import { cn } from "@/lib/cn";
import { dico, type Langue } from "@/lib/i18n";

export type VarianteMention = "ad" | "partner" | "maison";

export function libelleMention(variant: VarianteMention, lang: Langue) {
  const t = dico(lang);
  return variant === "ad" ? t.publicite : variant === "partner" ? t.contenuPartenaire : t.annonceDiwa;
}

export function SponsoredLabel({ variant = "ad", lang, className }: { variant?: VarianteMention; lang: Langue; className?: string }) {
  return (
    <span className={cn("block font-titre text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-or-fonce", className)}>
      {libelleMention(variant, lang)}
    </span>
  );
}
