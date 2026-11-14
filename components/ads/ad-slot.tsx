// AdSlot — point d'insertion d'un emplacement publicitaire (composant serveur).
// Lit la configuration (config/ads.config.ts) et les campagnes en cache, filtre selon la langue de la page,
// réserve l'espace du format, masque l'encart sur les appareils sans format, et prévoit la campagne
// interne de repli. Le choix de la campagne se fait dans le navigateur : les pages restent en cache.
import { adSlots, type CodeEmplacement, type ConfigEmplacement } from "@/config/ads.config";
import { getPublicites, type PubliciteAffichee } from "@/lib/data";
import type { Langue } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { Banniere, SlideAwards } from "@/components/site/banniere";
import { classesVisibilite, type FormeEncart } from "@/components/ads/cadres";
import { AdBanner } from "@/components/ads/ad-banner";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { PartnerWall } from "@/components/ads/partner-wall";
import { BandeauPartenaires, HouseAd, maisonsDisponibles } from "@/components/ads/house-ads";

const pourLangue = (pubs: PubliciteAffichee[], lang: Langue) => pubs.filter((p) => p.langue === "TOUTES" || p.langue === (lang === "fr" ? "FR" : "EN"));

export async function AdSlot({
  code,
  lang,
  decalage = 0,
  className,
}: {
  code: CodeEmplacement;
  lang: Langue;
  /** Différencie plusieurs encarts du même emplacement sur une page (campagne et repli différents). */
  decalage?: number;
  className?: string;
}) {
  const conf: ConfigEmplacement = adSlots[code];
  if (!conf.emplacement) return null; // emplacement des phases suivantes, pas encore en service
  const pubs = pourLangue((await getPublicites())[conf.emplacement], lang);
  const visibilite = classesVisibilite(conf.formats);

  if (conf.type === "logos") {
    const repli = maisonsDisponibles(conf.maisons).length ? <BandeauPartenaires lang={lang} /> : null;
    return pubs.length ? <PartnerWall partners={pubs} repli={repli} /> : repli;
  }

  if (conf.type === "carousel") {
    // Sans annonceur, le visuel Awards garde son format d'origine ; avec annonceurs, il devient la
    // première diapositive du billboard.
    if (!pubs.length) return <Banniere lang={lang} />;
    return (
      <AdCarousel
        pubs={pubs}
        maison={<SlideAwards lang={lang} />}
        interval={conf.interval}
        maxItems={conf.maxItems}
        className={cn("mx-auto w-full max-w-7xl px-4 pt-4", visibilite, className)}
      />
    );
  }

  const forme: Exclude<FormeEncart, "billboard"> = conf.type === "rectangle" ? "rectangle" : "banner";
  const maisons = maisonsDisponibles(conf.maisons);
  const maison = maisons.length ? maisons[decalage % maisons.length] : null;
  const repli = maison ? <HouseAd maison={maison} forme={forme} lang={lang} className={cn(visibilite, className)} /> : null;
  if (!pubs.length) return repli;
  return <AdBanner pubs={pubs} forme={forme} decalage={decalage} repli={repli} className={cn(visibilite, className)} />;
}
