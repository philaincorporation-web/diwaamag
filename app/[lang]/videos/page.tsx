import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { getVideos } from "@/lib/data";
import { dico } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { CarteVerticale } from "@/components/site/cartes";
import { EnTetePage } from "@/components/site/liste";
import { Apparition } from "@/components/site/animations";

export async function generateMetadata({ params }: PageProps<"/[lang]/videos">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  const t = dico(lang);
  return { title: t.videos, description: t.videosDescription, alternates: alternates(lang, "/videos") };
}

export default async function PageVideos({ params }: PageProps<"/[lang]/videos">) {
  const lang = langueParams((await params).lang);
  const t = dico(lang);
  const videos = await getVideos(lang, 48);
  return (
    <>
      <EnTetePage surtitre="DIWA TV" titre={t.videos} description={t.videosDescription} />
      <div className="mx-auto max-w-7xl px-4 py-12">
        {videos.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v, i) => (
              <Apparition key={v.id} delai={(i % 3) * 0.06}>
                <CarteVerticale article={v} lang={lang} />
              </Apparition>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-xl py-16 text-center">
            <Bot className="mx-auto size-16 text-or" aria-hidden />
            <h2 className="mt-4 font-titre text-3xl uppercase">{t.videosVides}</h2>
            <p className="mt-3 text-texte-doux">{t.videosVidesTexte}</p>
          </div>
        )}
      </div>
    </>
  );
}
