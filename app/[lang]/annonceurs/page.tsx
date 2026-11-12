import type { Metadata } from "next";
import { BarChart3, BadgeCheck, Mail, Megaphone, Target } from "lucide-react";
import { getChiffresMagazine } from "@/lib/data";
import { dico, type Langue } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { EnTetePage } from "@/components/site/liste";
import { FormulaireAnnonceur } from "@/components/site/interactifs";

const TEXTES = {
  fr: {
    surtitre: "Publicité & partenariats",
    titre: "Annoncer dans Diwaa Mag",
    description:
      "Associez votre marque au magazine des femmes du numérique en Afrique : une audience qualifiée de professionnelles, d'entrepreneures, d'étudiantes et de décideurs de la tech.",
    audienceTitre: "Une audience qualifiée",
    audience: [
      "Femmes du numérique, entrepreneures, ingénieures et étudiantes en tech au Gabon et en Afrique",
      "Décideurs publics et privés de l'écosystème numérique",
      "La communauté des DigieWomen Awards Africa (4e édition) : candidates, lauréates, jury et partenaires",
      "Un site bilingue français / anglais, ouvert aux lecteurs anglophones",
    ],
    chiffres: { articles: "articles publiés", rubriques: "rubriques", numeros: "numéro(s) du magazine" },
    chiffresNote: "Statistiques détaillées d'audience (visites, lecteurs, abonnés) communiquées sur demande.",
    offresTitre: "Nos offres",
    emplacementsTitre: "Emplacements et formats",
    engagementsTitre: "Nos engagements",
    engagements: [
      ["Transparence", "Les bannières portent la mention « Publicité » et les articles sponsorisés la mention « Contenu partenaire »."],
      ["Rapport chiffré", "Nombre d'affichages et de clics de chaque campagne, transmis pendant et à la fin de la diffusion."],
      ["Indépendance", "La rédaction reste maîtresse de ses contenus ; aucune publicité concurrente n'apparaît dans un contenu partenaire."],
    ],
    formulaireTitre: "Parlons de votre projet",
    formulaireTexte: "Décrivez vos objectifs : notre service commercial vous propose une offre adaptée sous 48 heures ouvrées.",
    direct: "Ou écrivez-nous directement :",
  },
  en: {
    surtitre: "Advertising & partnerships",
    titre: "Advertise in Diwaa Mag",
    description:
      "Associate your brand with the magazine of women in tech in Africa: a qualified audience of professionals, entrepreneurs, students and tech decision-makers.",
    audienceTitre: "A qualified audience",
    audience: [
      "Women in tech, entrepreneurs, engineers and tech students in Gabon and across Africa",
      "Public and private decision-makers of the digital ecosystem",
      "The DigieWomen Awards Africa community (4th edition): candidates, winners, jury and partners",
      "A bilingual French / English website, open to English-speaking readers",
    ],
    chiffres: { articles: "published articles", rubriques: "sections", numeros: "magazine issue(s)" },
    chiffresNote: "Detailed audience figures (visits, readers, subscribers) available on request.",
    offresTitre: "Our offers",
    emplacementsTitre: "Placements and formats",
    engagementsTitre: "Our commitments",
    engagements: [
      ["Transparency", "Banners are labelled “Advertisement” and sponsored articles “Partner content”."],
      ["Reporting", "Impressions and clicks for each campaign, shared during and after the campaign."],
      ["Independence", "The newsroom keeps full control of its content; no competing ads appear in partner content."],
    ],
    formulaireTitre: "Let's talk about your project",
    formulaireTexte: "Tell us about your goals: our sales team will send you a tailored proposal within 2 business days.",
    direct: "Or email us directly:",
  },
} as const;

const OFFRES: Record<Langue, { valeur: string; titre: string; texte: string }[]> = {
  fr: [
    { valeur: "pack-awards", titre: "Pack partenaire DigieWomen Awards", texte: "Votre logo sur le site, le magazine imprimé, la cérémonie et nos réseaux sociaux, avec un contenu partenaire dédié. Notre offre la plus complète." },
    { valeur: "rubrique", titre: "Sponsor de rubrique", texte: "« Cybersécurité & IA, présentée par votre marque » : une association durable à une thématique, sur 3 à 12 mois." },
    { valeur: "bannieres", titre: "Bannières", texte: "Haut de page, accueil, articles et barre latérale, avec rotation entre annonceurs et rapport d'affichages et de clics." },
    { valeur: "contenu-partenaire", titre: "Contenu partenaire", texte: "Portrait, interview ou dossier réalisé avec la rédaction, clairement signalé comme contenu partenaire." },
    { valeur: "newsletter-whatsapp", titre: "Newsletter et WhatsApp", texte: "« Cette édition vous est offerte par… » : votre bannière en tête de notre lettre d'information." },
    { valeur: "annonces", titre: "Annonces emploi et formation", texte: "Offres d'emploi, de stage, de formation et appels à candidatures destinés aux femmes du numérique." },
    { valeur: "video", titre: "Vidéo", texte: "Mention de votre marque dans nos vidéos et les interventions de l'avatar AFDY." },
  ],
  en: [
    { valeur: "pack-awards", titre: "DigieWomen Awards partner pack", texte: "Your logo on the website, the printed magazine, the ceremony and our social media, with dedicated partner content. Our most complete offer." },
    { valeur: "rubrique", titre: "Section sponsorship", texte: "“Cybersecurity & AI, presented by your brand”: a lasting association with a topic, for 3 to 12 months." },
    { valeur: "bannieres", titre: "Banners", texte: "Top of page, home page, articles and sidebar, with rotation between advertisers and impression and click reports." },
    { valeur: "contenu-partenaire", titre: "Partner content", texte: "Profile, interview or feature produced with the newsroom, clearly labelled as partner content." },
    { valeur: "newsletter-whatsapp", titre: "Newsletter and WhatsApp", texte: "“This issue is brought to you by…”: your banner at the top of our newsletter." },
    { valeur: "annonces", titre: "Job and training listings", texte: "Job, internship and training offers and calls for applications aimed at women in tech." },
    { valeur: "video", titre: "Video", texte: "Your brand mentioned in our videos and in the AFDY avatar's segments." },
  ],
};

const EMPLACEMENTS: Record<Langue, [string, string, string][]> = {
  fr: [
    ["Haut de page", "Sous le menu, sur toutes les pages du site", "1600 × 200 px"],
    ["Accueil", "Entre les grandes sections de la page d'accueil", "1600 × 200 px"],
    ["Article", "Avant et après le texte de chaque article", "1600 × 200 px"],
    ["Barre latérale", "Accueil, rubriques et articles", "600 × 600 ou 600 × 900 px"],
    ["Mur des partenaires", "Logos au-dessus du pied de page, sur toutes les pages", "Logo PNG transparent, 400 × 160 px"],
    ["Newsletter", "En tête de chaque lettre d'information", "1200 × 300 px"],
  ],
  en: [
    ["Top of page", "Below the menu, on every page", "1600 × 200 px"],
    ["Home page", "Between the main sections of the home page", "1600 × 200 px"],
    ["Article", "Before and after the text of every article", "1600 × 200 px"],
    ["Sidebar", "Home page, sections and articles", "600 × 600 or 600 × 900 px"],
    ["Partner wall", "Logos above the footer, on every page", "Transparent PNG logo, 400 × 160 px"],
    ["Newsletter", "At the top of every newsletter", "1200 × 300 px"],
  ],
};

export async function generateMetadata({ params }: PageProps<"/[lang]/annonceurs">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  const t = TEXTES[lang];
  return { title: t.titre, description: t.description, alternates: alternates(lang, "/annonceurs") };
}

export default async function Annonceurs({ params }: PageProps<"/[lang]/annonceurs">) {
  const lang = langueParams((await params).lang);
  const t = TEXTES[lang];
  const d = dico(lang);
  const chiffres = await getChiffresMagazine();
  return (
    <>
      <EnTetePage surtitre={t.surtitre} titre={t.titre} description={t.description} />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {/* Audience */}
        <section className="grid gap-8 md:grid-cols-[1.3fr_1fr]" aria-labelledby="audience">
          <div>
            <h2 id="audience" className="flex items-center gap-2 font-titre text-2xl uppercase tracking-wide">
              <Target className="size-6 text-or-fonce" aria-hidden /> {t.audienceTitre}
            </h2>
            <ul className="mt-5 space-y-3">
              {t.audience.map((ligne) => (
                <li key={ligne} className="flex gap-3 text-[15px] leading-relaxed">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-or-fonce" aria-hidden /> {ligne}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-noir p-6 text-white">
            <dl className="grid grid-cols-3 gap-4 text-center">
              {(["articles", "rubriques", "numeros"] as const).map((k) => (
                <div key={k}>
                  <dt className="sr-only">{t.chiffres[k]}</dt>
                  <dd className="font-titre text-4xl font-bold text-or">{chiffres[k]}</dd>
                  <dd className="mt-1 text-xs uppercase tracking-wide text-white/70">{t.chiffres[k]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 flex gap-2 border-t border-white/15 pt-4 text-sm text-white/80">
              <BarChart3 className="mt-0.5 size-4 shrink-0 text-or" aria-hidden /> {t.chiffresNote}
            </p>
          </div>
        </section>

        {/* Offres */}
        <section aria-labelledby="offres">
          <h2 id="offres" className="flex items-center gap-2 font-titre text-2xl uppercase tracking-wide">
            <Megaphone className="size-6 text-or-fonce" aria-hidden /> {t.offresTitre}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OFFRES[lang].map((o, i) => (
              <li key={o.valeur} className={i === 0 ? "border-2 border-or bg-or-clair/40 p-5 sm:col-span-2 lg:col-span-1" : "border border-ligne p-5"}>
                <h3 className="font-titre text-lg uppercase tracking-wide">{o.titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-texte-doux">{o.texte}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Emplacements */}
        <section aria-labelledby="emplacements">
          <h2 id="emplacements" className="font-titre text-2xl uppercase tracking-wide">{t.emplacementsTitre}</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <tbody className="divide-y divide-ligne border-y border-ligne">
                {EMPLACEMENTS[lang].map(([nom, ou, format]) => (
                  <tr key={nom}>
                    <th scope="row" className="py-3 pr-4 text-left font-semibold">{nom}</th>
                    <td className="py-3 pr-4 text-texte-doux">{ou}</td>
                    <td className="py-3 text-right font-mono text-xs">{format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Engagements */}
        <section aria-labelledby="engagements">
          <h2 id="engagements" className="font-titre text-2xl uppercase tracking-wide">{t.engagementsTitre}</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {t.engagements.map(([titre, texte]) => (
              <li key={titre} className="border-t-4 border-or bg-fond-2 p-5">
                <h3 className="font-semibold">{titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-texte-doux">{texte}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Formulaire */}
        <section id="demande" className="grid scroll-mt-24 gap-10 md:grid-cols-[1fr_300px]" aria-labelledby="formulaire">
          <div>
            <h2 id="formulaire" className="font-titre text-2xl uppercase tracking-wide">{t.formulaireTitre}</h2>
            <p className="mb-6 mt-2 text-sm text-texte-doux">{t.formulaireTexte}</p>
            <FormulaireAnnonceur offres={OFFRES[lang].map((o) => ({ valeur: o.valeur, libelle: o.titre }))} />
          </div>
          <aside className="h-fit space-y-3 bg-fond-2 p-6 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <Mail className="size-4 text-or-fonce" aria-hidden /> {d.serviceCommercial}
            </p>
            <p className="text-texte-doux">{t.direct}</p>
            <a href="mailto:diwamag@digiewomen.com" className="font-semibold hover:text-or-fonce">diwamag@digiewomen.com</a>
          </aside>
        </section>
      </div>
    </>
  );
}
