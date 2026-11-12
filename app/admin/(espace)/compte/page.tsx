import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { Carte, EnTeteAdmin } from "@/components/admin/presentation";
import { FormulaireMotDePasse } from "@/components/admin/formulaires";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Mon compte" };

export default async function PageCompte() {
  const admin = await exigerAdmin();
  return (
    <>
      <EnTeteAdmin titre="Mon compte" description={`${admin.nom} · ${admin.email}`} />
      <Carte titre="Changer de mot de passe">
        <FormulaireMotDePasse />
      </Carte>
    </>
  );
}
