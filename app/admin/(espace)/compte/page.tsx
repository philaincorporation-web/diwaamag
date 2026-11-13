import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { Carte, EnTeteAdmin } from "@/components/admin/presentation";
import { FormulaireMotDePasse } from "@/components/admin/formulaires";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Mon compte" };

export default async function PageCompte() {
  // Seule page accessible avec un mot de passe provisoire (compte reçu par invitation).
  const admin = await exigerAdmin({ motDePasseProvisoireAutorise: true });
  return (
    <>
      <EnTeteAdmin titre="Mon compte" description={`${admin.nom} · ${admin.email}`} />
      {admin.doitChangerMotDePasse && (
        <div className="mb-6 flex gap-3 border-l-4 border-or bg-or-clair/50 px-5 py-4">
          <KeyRound className="mt-0.5 size-5 shrink-0 text-or-fonce" aria-hidden />
          <div className="text-sm">
            <p className="font-bold">Bienvenue sur le back-office de DIWA MAG !</p>
            <p className="mt-1">
              Pour sécuriser votre compte, choisissez votre propre mot de passe. Saisissez d&apos;abord le mot de passe provisoire reçu par e-mail. Le reste du back-office sera accessible juste après.
            </p>
          </div>
        </div>
      )}
      <Carte titre={admin.doitChangerMotDePasse ? "Choisir mon mot de passe" : "Changer de mot de passe"}>
        <FormulaireMotDePasse />
      </Carte>
    </>
  );
}
