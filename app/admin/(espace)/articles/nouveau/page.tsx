import type { Metadata } from "next";
import { donneesEditeur } from "@/lib/admin-donnees";
import { DOCUMENT_VIDE } from "@/lib/content";
import { EnTeteAdmin } from "@/components/admin/presentation";
import { FormulaireArticle } from "@/components/admin/formulaire-article";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Nouvel article" };

export default async function NouvelArticle() {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const d = await donneesEditeur();
  return (
    <>
      <EnTeteAdmin titre="Nouvel article" description="Brouillon → Publié ou Programmé. Image de Une, texte alternatif et chapeau sont requis pour publier." />
      <FormulaireArticle
        {...d}
        article={{
          titre: "",
          slug: "",
          chapeau: "",
          contenu: DOCUMENT_VIDE,
          rubriqueId: "",
          type: "ACTUALITE",
          motsCles: "",
          imageUneUrl: "",
          imageUneAlt: "",
          videoUrl: "",
          aLaUne: false,
          metaTitre: "",
          metaDescription: "",
          dateProgrammee: "",
          statut: "BROUILLON",
        }}
      />
    </>
  );
}
