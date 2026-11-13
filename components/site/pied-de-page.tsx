import Link from "next/link";
import { Rss } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { ReseauxSociaux } from "@/components/site/reseaux";
import { AnneeCourante } from "@/components/site/annee";
import { BoutonNotifications } from "@/components/pwa/client-pwa";
import { dico, lien, type Langue } from "@/lib/i18n";

type RubriqueNav = { nom: string; slug: string; famille: "GEOGRAPHIQUE" | "THEMATIQUE" };

export function PiedDePage({ rubriques, lang }: { rubriques: RubriqueNav[]; lang: Langue }) {
  const t = dico(lang);
  const L = (p: string) => lien(lang, p);
  return (
    <footer className="mt-auto bg-fond-sombre text-white/70">
      <div className="h-1 bg-or" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo clair taille="sm" href={L("/")} slogan={t.slogan} />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">{t.presentationPied}</p>
          <ReseauxSociaux className="mt-6 text-white" />
          <div className="mt-6">
            <BoutonNotifications />
          </div>
        </div>
        <div>
          <h2 className="font-titre text-sm uppercase tracking-[0.2em] text-or">{t.rubriques}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {rubriques.map((r) => (
              <li key={r.slug}>
                <Link href={L(`/rubrique/${r.slug}`)} className="hover:text-or">{r.nom}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-titre text-sm uppercase tracking-[0.2em] text-or">{t.leMagazine}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href={L("/numeros")} className="hover:text-or">{t.anciensNumeros}</Link></li>
            <li><Link href={L("/veille")} className="hover:text-or">{t.veilleMedia}</Link></li>
            <li><Link href={L("/videos")} className="hover:text-or">{t.videos}</Link></li>
            <li><Link href={L("/recherche")} className="hover:text-or">{t.rechercher}</Link></li>
            <li><Link href={L("/a-propos")} className="hover:text-or">{t.aPropos}</Link></li>
            <li><Link href={L("/contact")} className="hover:text-or">{t.contact}</Link></li>
            <li>
              <a href="/rss.xml" className="inline-flex items-center gap-1.5 hover:text-or">
                <Rss className="size-3.5" aria-hidden /> {t.fluxRss}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-titre text-sm uppercase tracking-[0.2em] text-or">DIWAA</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href="https://digiewomenawards.com" target="_blank" rel="noopener" className="hover:text-or">digiewomenawards.com</a></li>
            <li><a href="mailto:redaction@digiewomen.com" className="hover:text-or">redaction@digiewomen.com</a></li>
            <li><Link href={L("/annonceurs")} className="font-semibold text-or hover:text-white">{t.devenirPartenaire}</Link></li>
            <li><a href="mailto:diwamag@digiewomen.com" className="hover:text-or">{t.serviceCommercial}</a></li>
            {process.env.NEXT_PUBLIC_WHATSAPP_CHAINE && (
              <li><a href={process.env.NEXT_PUBLIC_WHATSAPP_CHAINE} target="_blank" rel="noopener" className="hover:text-or">{t.whatsappTitre}</a></li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© <AnneeCourante /> {t.droits}</p>
          <div className="flex gap-5">
            <Link href={L("/mentions-legales")} className="hover:text-or">{t.mentionsLegales}</Link>
            <Link href={L("/confidentialite")} className="hover:text-or">{t.confidentialite}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
