import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getNumeros, getRubriques } from "@/lib/data";
import { dico, estLangue, LANGUES, type Langue } from "@/lib/i18n";
import { siteUrl } from "@/lib/format";
import { Racine } from "@/components/racine";
import { FournisseurLangue } from "@/components/i18n/contexte";
import { EnTete, EnTeteNavigation } from "@/components/site/en-tete";
import { PiedDePage } from "@/components/site/pied-de-page";
import { EcranChargement } from "@/components/site/animations";
import { ClientPwa } from "@/components/pwa/client-pwa";
import { Banniere } from "@/components/site/banniere";

export function generateStaticParams() {
  return LANGUES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const l: Langue = estLangue(lang) ? lang : "fr";
  const t = dico(l);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `DIWA MAG — ${t.slogan}`, template: "%s | DIWA MAG" },
    description: t.descriptionSite,
    applicationName: "DIWAA Magazine",
    appleWebApp: { capable: true, title: "DIWA Mag", statusBarStyle: "black-translucent" },
    openGraph: { type: "website", locale: l === "fr" ? "fr_FR" : "en_GB", alternateLocale: l === "fr" ? "en_GB" : "fr_FR", siteName: "DIWA MAG" },
    twitter: { card: "summary_large_image" },
    alternates: { types: { "application/rss+xml": siteUrl("/rss.xml") } },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = { themeColor: "#111111", width: "device-width", initialScale: 1 };

export default async function RacineSite({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!estLangue(lang)) notFound();
  const t = dico(lang);
  const [rubriques, numeros] = await Promise.all([getRubriques(lang), getNumeros(lang)]);
  const nav = rubriques.map((r) => ({ nom: r.nom, slug: r.slug, famille: r.famille }));
  const numero = numeros[0] ? { titre: numeros[0].titre, slug: numeros[0].slug } : null;
  return (
    <Racine lang={lang}>
      <FournisseurLangue lang={lang}>
        <a href="#contenu" className="sr-only z-[60] bg-or px-4 py-2 font-semibold text-noir focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          {t.allerAuContenu}
        </a>
        <EcranChargement />
        <Suspense fallback={<EnTete rubriques={nav} numeroCourant={numero} />}>
          <EnTeteNavigation rubriques={nav} numeroCourant={numero} />
        </Suspense>
        <Banniere lang={lang} />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <PiedDePage rubriques={nav} lang={lang} />
        <ClientPwa />
      </FournisseurLangue>
    </Racine>
  );
}
