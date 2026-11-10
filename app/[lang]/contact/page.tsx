import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { dico } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { EnTetePage } from "@/components/site/liste";
import { FormulaireContact } from "@/components/site/interactifs";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  return { title: dico(lang).contact, alternates: alternates(lang, "/contact") };
}

export default async function Contact({ params }: PageProps<"/[lang]/contact">) {
  const lang = langueParams((await params).lang);
  const en = lang === "en";
  return (
    <>
      <EnTetePage
        surtitre={en ? "Editorial team" : "Rédaction"}
        titre={dico(lang).contact}
        description={en ? "A story tip, a testimony, a partnership proposal: write to us." : "Une information, un témoignage, une proposition de partenariat : écrivez-nous."}
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 md:grid-cols-[1fr_320px]">
        <FormulaireContact />
        <aside className="space-y-6 bg-fond-2 p-6 text-sm">
          <div className="flex gap-3">
            <Mail className="mt-0.5 size-5 shrink-0 text-or-fonce" aria-hidden />
            <div>
              <p className="font-bold">{en ? "Editorial team" : "Rédaction"}</p>
              <a href="mailto:redaction@digiewomen.com" className="hover:text-or-fonce">redaction@digiewomen.com</a>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="mt-0.5 size-5 shrink-0 text-or-fonce" aria-hidden />
            <div>
              <p className="font-bold">{en ? "Advertising & sales" : "Service commercial et publicité"}</p>
              <a href="mailto:diwamag@digiewomen.com" className="hover:text-or-fonce">diwamag@digiewomen.com</a>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-or-fonce" aria-hidden />
            <div>
              <p className="font-bold">Digiewomen School</p>
              <p>Angondjé Sherko, Akanda — Gabon</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
