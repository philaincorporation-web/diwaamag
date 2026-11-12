import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { supprimerRubrique } from "@/lib/actions/gestion";
import { Carte, EnTeteAdmin } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { FormulaireRubrique, LigneRubriqueEditable } from "@/components/admin/formulaires";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Rubriques" };

export default async function PageRubriques() {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const rubriques = await prisma.rubrique.findMany({
    orderBy: [{ famille: "asc" }, { ordre: "asc" }],
    include: { _count: { select: { articles: true } } },
  });
  const familles = [
    { cle: "GEOGRAPHIQUE", titre: "Rubriques géographiques" },
    { cle: "THEMATIQUE", titre: "Rubriques thématiques" },
  ];
  return (
    <>
      <EnTeteAdmin titre="Rubriques" description="Création, renommage et ordre d'affichage dans la navigation." />
      <div className="grid gap-6 lg:grid-cols-2">
        {familles.map((f) => (
          <Carte key={f.cle} titre={f.titre}>
            <ul className="divide-y divide-ligne">
              {rubriques
                .filter((r) => r.famille === f.cle)
                .map((r) => (
                  <li key={r.id}>
                    <LigneRubriqueEditable rubrique={r}>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="size-3 shrink-0 rounded-full" style={{ background: r.couleur ?? "#cda40e" }} aria-hidden />
                        <div className="min-w-0">
                          <p className="font-semibold">{r.nom}{r.nomEn && <span className="ml-1 text-xs font-normal text-texte-doux">/ {r.nomEn}</span>} <span className="text-xs font-normal text-texte-doux">· ordre {r.ordre}</span></p>
                          <p className="text-xs text-texte-doux">/rubrique/{r.slug} · {r._count.articles} article(s)</p>
                        </div>
                      </div>
                      {r._count.articles === 0 && (
                        <BoutonAction action={supprimerRubrique.bind(null, r.id)} variante="danger" className="h-8 px-2" titre="Supprimer" confirmation={`Supprimer la rubrique « ${r.nom} » ?`}>
                          <Trash2 className="size-4" />
                        </BoutonAction>
                      )}
                    </LigneRubriqueEditable>
                  </li>
                ))}
            </ul>
          </Carte>
        ))}
      </div>
      <Carte titre="Nouvelle rubrique" className="mt-6">
        <FormulaireRubrique />
      </Carte>
    </>
  );
}
