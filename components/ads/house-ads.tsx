// Campagnes internes : affichées à la place d'un emplacement non vendu (jamais de cadre vide).
// Rien d'inventé : elles renvoient vers les vrais services du magazine (page Annonceurs, newsletter,
// chaîne WhatsApp). Elles portent la mention « Diwaa Mag vous informe », pas « Publicité ».
import Link from "next/link";
import { ArrowRight, Mail, Megaphone } from "lucide-react";
import { cn } from "@/lib/cn";
import { dico, lien, type Langue } from "@/lib/i18n";
import type { CampagneMaison } from "@/config/ads.config";
import { IconeMarque } from "@/components/site/reseaux";
import { CADRES, LARGEURS, type FormeEncart } from "@/components/ads/cadres";
import { SponsoredLabel } from "@/components/ads/sponsored-label";

const whatsapp = () => process.env.NEXT_PUBLIC_WHATSAPP_CHAINE || null;

/** Campagnes internes disponibles (la chaîne WhatsApp n'est proposée que si son adresse est configurée). */
export function maisonsDisponibles(liste: CampagneMaison[] = []) {
  return liste.filter((m) => m !== "digiewomen-awards" && (m !== "whatsapp" || whatsapp()));
}

type Contenu = { href: string; externe?: boolean; titre: string; texte: string; action: string; icone: React.ReactNode; theme: string; accent: string };

function contenu(m: CampagneMaison, lang: Langue): Contenu | null {
  const t = dico(lang);
  switch (m) {
    case "devenir-partenaire":
      return {
        href: lien(lang, "/annonceurs"),
        titre: t.maisonPartenaireTitre,
        texte: t.maisonPartenaireTexte,
        action: t.devenirPartenaire,
        icone: <Megaphone className="size-full" aria-hidden />,
        theme: "bg-noir text-white",
        accent: "text-or",
      };
    case "newsletter":
      return {
        href: `${lien(lang, "/")}#newsletter`,
        titre: t.maisonNewsletterTitre,
        texte: t.maisonNewsletterTexte,
        action: t.maisonNewsletterBouton,
        icone: <Mail className="size-full" aria-hidden />,
        theme: "bg-or text-noir",
        accent: "text-noir",
      };
    case "whatsapp": {
      const url = whatsapp();
      if (!url) return null;
      return {
        href: url,
        externe: true,
        titre: t.whatsappTitre,
        texte: t.whatsappTexte,
        action: t.whatsappBouton,
        icone: <IconeMarque nom="whatsapp" className="size-full text-[#25D366]" />,
        theme: "bg-[#0b3d2e] text-white",
        accent: "text-[#25D366]",
      };
    }
    default:
      return null;
  }
}

/** Repli discret du mur des partenaires (HP-10) : une ligne d'invitation au-dessus du pied de page. */
export function BandeauPartenaires({ lang }: { lang: Langue }) {
  const t = dico(lang);
  return (
    <aside aria-label={t.nosPartenaires} className="encart border-t border-ligne bg-fond">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5">
        <p className="text-sm text-texte-doux">
          <span className="mr-2 font-titre text-xs uppercase tracking-[0.2em] text-encre">{t.nosPartenaires}</span>
          {t.maisonPartenaireTexte}
        </p>
        <Link href={lien(lang, "/annonceurs")} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-or-fonce hover:text-encre">
          {t.devenirPartenaire} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}

/** Une campagne interne mise en page pour la forme de l'encart (bannière ou rectangle). */
export function HouseAd({ maison, forme, lang, className }: { maison: CampagneMaison; forme: Exclude<FormeEncart, "billboard">; lang: Langue; className?: string }) {
  const c = contenu(maison, lang);
  if (!c) return null;
  const Lien = c.externe ? "a" : Link;
  const externe = c.externe ? { target: "_blank", rel: "noopener" } : {};
  return (
    <aside aria-label={c.titre} className={cn("encart", className)}>
      <div className={cn(LARGEURS[forme], "mb-1.5 flex justify-end")}>
        <SponsoredLabel variant="maison" lang={lang} />
      </div>
      <Lien
        href={c.href}
        {...externe}
        className={cn(
          CADRES[forme],
          "group block overflow-hidden ring-1 ring-ligne transition hover:ring-or/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-or",
        )}
      >
        {/* Couleurs sur l'élément intérieur : dans un corps d'article, le style des liens s'applique à <a>. */}
        <span
          className={cn(
            "flex size-full",
            c.theme,
            forme === "banner" ? "items-center gap-3 px-4 md:gap-5 md:px-6" : "flex-col justify-between p-6",
          )}
        >
        <span className={cn("shrink-0", c.accent, forme === "banner" ? "hidden size-9 sm:block" : "size-10")}>{c.icone}</span>
        <span className={cn("min-w-0", forme === "banner" && "flex-1")}>
          <span className={cn("block font-titre uppercase leading-tight tracking-wide", forme === "banner" ? "text-base md:text-xl" : "text-2xl")}>{c.titre}</span>
          <span className={cn("mt-1 block text-sm leading-snug opacity-85", forme === "banner" && "line-clamp-2 md:line-clamp-1")}>{c.texte}</span>
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wide",
            forme === "banner" ? "hidden md:inline-flex" : "mt-4",
            c.accent,
          )}
        >
          {c.action}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden />
        </span>
        </span>
      </Lien>
    </aside>
  );
}
