import type { Metadata } from "next";
import Link from "next/link";
import { dico, lien } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { PageTexte } from "@/components/site/page-texte";

export async function generateMetadata({ params }: PageProps<"/[lang]/a-propos">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  return { title: dico(lang).aPropos, alternates: alternates(lang, "/a-propos") };
}

export default async function APropos({ params }: PageProps<"/[lang]/a-propos">) {
  const lang = langueParams((await params).lang);
  if (lang === "en") {
    return (
      <PageTexte surtitre="The magazine" titre="About us">
        <p>
          <strong>DIWA MAG</strong> is the online magazine of the <strong>DigieWomen Awards Africa (DIWAA)</strong>. It covers digital news
          from Gabon, Africa and the rest of the world, with a particular focus on the women driving the continent&apos;s digital
          transformation.
        </p>
        <p>
          It extends the official website <a href="https://digiewomenawards.com" target="_blank" rel="noopener">digiewomenawards.com</a> and gives
          lasting visibility to the DIWAA initiative, its award winners, ambassadors and partners.
        </p>
        <h2>Our sections</h2>
        <ul>
          <li><strong>Gabon, Africa, World</strong>: digital news, from local to global.</li>
          <li><strong>Women in tech</strong> and <strong>Award winners</strong>: the women who innovate, build and inspire.</li>
          <li><strong>Startups &amp; innovation</strong>, <strong>Cybersecurity &amp; AI</strong>: the ecosystems and technologies that change the game.</li>
          <li><strong>Events</strong>: DIWAA and industry highlights.</li>
        </ul>
        <h2>The team</h2>
        <p>
          The magazine is published by <strong>Digiewomen School</strong> — Angondjé Sherko, Akanda (Gabon). Co-founder and publisher: Ms Christine
          Baguéla Soro. Co-founder and patron: Ms Annie Chrystel Limbourg Iwenga.
        </p>
        <p>
          A question, a story tip, a partnership proposal? <Link href={lien(lang, "/contact")}>Write to the editorial team</Link>.
        </p>
      </PageTexte>
    );
  }
  return (
    <PageTexte surtitre="Le magazine" titre="À propos">
      <p>
        <strong>DIWA MAG</strong> est le magazine en ligne des <strong>DigieWomen Awards Africa (DIWAA)</strong>. Il est consacré à
        l&apos;actualité du numérique au Gabon, en Afrique et dans le monde, avec une attention particulière portée aux femmes qui
        font la transformation digitale du continent.
      </p>
      <p>
        Il prolonge le site officiel <a href="https://digiewomenawards.com" target="_blank" rel="noopener">digiewomenawards.com</a> et
        offre une visibilité permanente à l&apos;initiative DIWAA, à ses lauréates, à ses ambassadrices et à ses partenaires.
      </p>
      <h2>Nos rubriques</h2>
      <ul>
        <li><strong>Gabon, Afrique, Monde</strong> : l&apos;actualité du numérique, du local au global.</li>
        <li><strong>Femmes du numérique</strong> et <strong>Portraits des lauréates</strong> : celles qui innovent, entreprennent et inspirent.</li>
        <li><strong>Startups et innovation</strong>, <strong>Cybersécurité et IA</strong> : les écosystèmes et les technologies qui changent la donne.</li>
        <li><strong>Événements et agenda</strong> : les rendez-vous DIWAA et du secteur.</li>
      </ul>
      <h2>L&apos;équipe</h2>
      <p>
        Le magazine est porté par <strong>Digiewomen School</strong> — Angondjé Sherko, Akanda (Gabon). Co-initiatrice et éditrice :
        Mme Christine Baguéla épse Soro. Co-initiatrice et marraine : Mme Annie Chrystel Limbourg Iwenga.
      </p>
      <p>
        Une question, une information, une proposition de partenariat ? <Link href={lien(lang, "/contact")}>Écrivez à la rédaction</Link>.
      </p>
    </PageTexte>
  );
}
