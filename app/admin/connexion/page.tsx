import type { Metadata } from "next";
import { Suspense } from "react";
import { FormulaireConnexion } from "@/components/admin/formulaire-connexion";

export const metadata: Metadata = { title: "Connexion — Back-office", robots: { index: false, follow: false } };

export default function PageConnexion({ searchParams }: PageProps<"/admin/connexion">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-noir p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -bottom-32 -right-32 size-[28rem] rounded-full border-[60px] border-or/15" aria-hidden />
        <p className="font-titre text-6xl font-bold uppercase">
          DIW<span className="text-or">A</span> <span className="bg-or px-2 text-3xl text-noir">MAG</span>
        </p>
        <div className="relative">
          <p className="font-titre text-sm uppercase tracking-[0.3em] text-or">Back-office</p>
          <p className="mt-3 max-w-md font-serif text-2xl leading-snug text-white/85">
            Rédiger, publier et faire rayonner les femmes du numérique africain.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-fond-2 p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-titre text-3xl uppercase">Connexion</h1>
          <p className="mt-1 text-sm text-texte-doux">Espace réservé aux administrateurs du DIWA MAG.</p>
          <Suspense fallback={<FormulaireConnexion retour="/admin" />}>
            <Formulaire searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function Formulaire({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { retour } = await searchParams;
  return <FormulaireConnexion retour={typeof retour === "string" ? retour : "/admin"} />;
}
