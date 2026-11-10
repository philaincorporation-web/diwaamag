import type { Metadata } from "next";
import { dico } from "@/lib/i18n";
import { alternates, langueParams } from "@/lib/seo";
import { PageTexte } from "@/components/site/page-texte";

export async function generateMetadata({ params }: PageProps<"/[lang]/confidentialite">): Promise<Metadata> {
  const lang = langueParams((await params).lang);
  return { title: dico(lang).confidentialite, alternates: alternates(lang, "/confidentialite") };
}

export default async function Confidentialite({ params }: PageProps<"/[lang]/confidentialite">) {
  const lang = langueParams((await params).lang);
  if (lang === "en") {
    return (
      <PageTexte surtitre="Your data" titre="Privacy policy">
        <p>
          This policy explains what personal data DIWA MAG collects, why, and how to exercise your rights. It applies in accordance with
          Gabonese law no. 025/2023 on the protection of personal data.
        </p>
        <h2>Comments</h2>
        <p>
          To post a comment, we collect your <strong>name</strong>, your <strong>email address</strong>, your message, an optional link and your IP
          address. Your name and message are published. Your email address is <strong>never displayed publicly</strong>: it is kept in the back
          office for traceability and moderation (fighting spam and abuse). The IP address is only used to limit abusive submissions.
        </p>
        <h2>Newsletter</h2>
        <p>Your email address is only used to send the newsletter, after confirmation (double opt-in). Every email includes an instant unsubscribe link.</p>
        <h2>Notifications and weather</h2>
        <p>
          If you turn on notifications, we store a technical subscription identifier provided by your browser, with no personal data. The weather
          widget queries Open-Meteo directly from your browser; your location is only used if you choose “My location” and is never sent to us.
        </p>
        <h2>Audience measurement</h2>
        <p>We count article views anonymously, without tracking cookies. Your theme choice and preferred city are stored only on your device.</p>
        <h2>Your rights</h2>
        <p>You may request access to, correction or deletion of your data by writing to <a href="mailto:redaction@digiewomen.com">redaction@digiewomen.com</a>.</p>
      </PageTexte>
    );
  }
  return (
    <PageTexte surtitre="Vos données" titre="Confidentialité">
      <p>
        Cette politique explique quelles données personnelles DIWA MAG collecte, pourquoi, et comment exercer vos droits. Elle
        s&apos;applique conformément à la loi gabonaise n°025/2023 relative à la protection des données à caractère personnel.
      </p>
      <h2>Commentaires</h2>
      <p>
        Pour publier un commentaire, nous collectons votre <strong>nom</strong>, votre <strong>adresse e-mail</strong>, votre message,
        un éventuel lien et votre adresse IP. Votre nom et votre message sont publiés. Votre adresse e-mail n&apos;est{" "}
        <strong>jamais affichée publiquement</strong> : elle est conservée dans le back-office à des fins de traçabilité et de
        modération (lutte contre le spam et les abus). L&apos;adresse IP sert uniquement à limiter les envois abusifs.
      </p>
      <h2>Newsletter</h2>
      <p>
        Votre adresse e-mail est utilisée uniquement pour l&apos;envoi de la newsletter, après confirmation (double opt-in). Chaque
        envoi comporte un lien de désinscription immédiate.
      </p>
      <h2>Notifications et météo</h2>
      <p>
        Si vous activez les notifications, nous conservons un identifiant technique d&apos;abonnement fourni par votre navigateur, sans
        donnée nominative. Le module météo interroge Open-Meteo directement depuis votre navigateur ; votre position n&apos;est utilisée
        que si vous choisissez « Ma position » et ne nous est jamais transmise.
      </p>
      <h2>Mesure d&apos;audience</h2>
      <p>Nous comptons le nombre de lectures de chaque article de façon anonyme, sans cookie de suivi. Votre choix de thème et votre ville préférée restent uniquement sur votre appareil.</p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en écrivant à{" "}
        <a href="mailto:redaction@digiewomen.com">redaction@digiewomen.com</a>.
      </p>
    </PageTexte>
  );
}
