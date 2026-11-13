// Bannière promotionnelle DigieWomen Awards Africa, affichée sous la navigation sur tout le site public.
// Effets au survol (CSS pur, désactivés si l'utilisateur préfère réduire les animations) :
// léger zoom de l'image, reflet doré qui balaie la bannière, ombre portée et bouton « S'inscrire ».
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Langue } from "@/lib/i18n";
import banniere from "@/public/banniere/digiewomen-awards-2026.png";

const TEXTES = {
  fr: {
    alt: "DigieWomen Awards Africa, 4e édition : la femme digitale africaine de l'année remportera 5 000 000 FCFA et un billet d'avion vers la destination de son choix. Inscription sur www.digiewomenawards.com",
    action: "Voter maintenant",
    publicite: "Partenaire",
  },
  en: {
    alt: "DigieWomen Awards Africa, 4th edition: the African digital woman of the year will win 5,000,000 FCFA and a plane ticket to the destination of her choice. Register at www.digiewomenawards.com",
    action: "Vote now",
    publicite: "Partner",
  },
} as const;

export function Banniere({ lang }: { lang: Langue }) {
  const t = TEXTES[lang];
  return (
    <aside aria-label={t.publicite} className="mx-auto w-full max-w-7xl px-4 pt-4">
      <a
        href="https://www.digiewomenawards.com"
        target="_blank"
        rel="noopener"
        className="banniere group relative block overflow-hidden rounded-md shadow-sm ring-1 ring-black/5 transition duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-or motion-safe:hover:-translate-y-0.5 hover:shadow-xl hover:shadow-or/20 hover:ring-or/60"
      >
        <Image
          src={banniere}
          alt={t.alt}
          sizes="(min-width: 1280px) 1248px, calc(100vw - 32px)"
          placeholder="blur"
          className="h-auto w-full transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03]"
        />
        {/* Reflet doré qui traverse la bannière au survol */}
        <span
          aria-hidden
          className="banniere-reflet pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0"
        />
        <span className="pointer-events-none absolute bottom-2 right-2 hidden items-center gap-1 rounded-full bg-or px-3 py-1 text-xs font-bold uppercase tracking-wide text-noir opacity-0 shadow-md transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline-flex motion-safe:translate-y-1 motion-safe:group-hover:translate-y-0">
          {t.action}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </span>
      </a>
    </aside>
  );
}
