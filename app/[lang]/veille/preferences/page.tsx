import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { lien } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { EnTetePage } from "@/components/site/liste";
import { PreferencesVeille } from "@/components/site/veille-client";
import { getCategoriesVeille } from "@/lib/veille/donnees";
import { TEXTES_PREFERENCES } from "@/lib/veille/textes";

export async function generateMetadata({ params }: PageProps<"/[lang]/veille/preferences">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  return { title: TEXTES_PREFERENCES[lang].titre, robots: { index: false }, alternates: alternates(lang, "/veille/preferences") };
}

export default async function PagePreferences({ params }: PageProps<"/[lang]/veille/preferences">) {
  const lang = langueParams((await params).lang);
  const t = TEXTES_PREFERENCES[lang];
  const categories = await getCategoriesVeille();
  return (
    <>
      <EnTetePage titre={t.titre} description={t.description} />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Link href={lien(lang, "/veille")} className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-or-fonce hover:text-encre">
          <ArrowLeft className="size-4" aria-hidden /> {t.retour}
        </Link>
        <PreferencesVeille categories={categories} />
      </div>
    </>
  );
}
