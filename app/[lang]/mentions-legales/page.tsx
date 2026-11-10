import type { Metadata } from "next";
import { dico } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { PageTexte } from "@/components/site/page-texte";

export async function generateMetadata({ params }: PageProps<"/[lang]/mentions-legales">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  return { title: dico(lang).mentionsLegales, alternates: alternates(lang, "/mentions-legales") };
}

export default async function MentionsLegales({ params }: PageProps<"/[lang]/mentions-legales">) {
  const lang = langueParams((await params).lang);
  if (lang === "en") {
    return (
      <PageTexte surtitre="Information" titre="Legal notice">
        <h2>Publisher</h2>
        <p>
          DIWA MAG is published by <strong>Digiewomen School</strong>, Angondjé Sherko, Akanda (Gabon). Contact:{" "}
          <a href="mailto:redaction@digiewomen.com">redaction@digiewomen.com</a>.
        </p>
        <p>Publication director: Ms Christine Baguéla Soro.</p>
        <h2>Hosting</h2>
        <p>The website is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. Database hosted by Neon (Europe region).</p>
        <h2>Intellectual property</h2>
        <p>All published content (texts, photographs, videos, logos) is protected. Any reproduction without the publisher&apos;s written consent is prohibited, except for sharing links to articles.</p>
      </PageTexte>
    );
  }
  return (
    <PageTexte surtitre="Informations" titre="Mentions légales">
      <h2>Éditeur</h2>
      <p>
        DIWA MAG est édité par <strong>Digiewomen School</strong>, Angondjé Sherko, Akanda (Gabon). Contact :{" "}
        <a href="mailto:redaction@digiewomen.com">redaction@digiewomen.com</a>.
      </p>
      <p>Direction de la publication : Mme Christine Baguéla épse Soro.</p>
      <h2>Hébergement</h2>
      <p>Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Base de données hébergée par Neon (région Europe).</p>
      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus publiés (textes, photographies, vidéos, logos) est protégé. Toute reproduction sans autorisation
        écrite de l&apos;éditeur est interdite, à l&apos;exception du partage des liens vers les articles.
      </p>
      <p className="text-sm text-texte-doux">Ces mentions sont à compléter et à faire valider par l&apos;éditeur (numéro d&apos;immatriculation, adresse postale complète).</p>
    </PageTexte>
  );
}
