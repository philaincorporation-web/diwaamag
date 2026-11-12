import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin";
import { dateHeure } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ResultatImportSchema } from "@/lib/import-pdf/schema";
import { LIBELLES_IMPORT } from "@/lib/import-pdf/libelles";
import { libererTraitementsBloques } from "@/lib/import-pdf/traitement";
import { Carte, EnTeteAdmin } from "@/components/admin/presentation";
import { RevueImport, SuiviImport } from "@/components/admin/import-pdf";
import { classesBouton } from "@/components/admin/styles";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Import PDF" };

export default async function PageImport({ params, searchParams }: PageProps<"/admin/imports/[id]">) {
  await exigerAdmin();
  const [{ id }, { doublon }] = await Promise.all([params, searchParams]);
  await libererTraitementsBloques();
  const imp = await prisma.importPdf.findUnique({
    where: { id },
    include: { admin: { select: { nom: true } }, article: { select: { id: true, titre: true, statut: true } } },
  });
  if (!imp) notFound();
  const statut = LIBELLES_IMPORT[imp.statut];
  const resultat = imp.statut === "A_VERIFIER" ? ResultatImportSchema.safeParse(imp.resultat) : null;
  const rubriques = resultat?.success ? await prisma.rubrique.findMany({ select: { id: true, slug: true, nom: true }, orderBy: { ordre: "asc" } }) : [];

  return (
    <>
      <EnTeteAdmin
        titre={imp.statut === "A_VERIFIER" ? "Vérifier l'article importé" : "Import PDF"}
        description={`${imp.nomFichier} · ${imp.pages ? `${imp.pages} page(s) · ` : ""}importé par ${imp.admin.nom} le ${dateHeure(imp.creeLe)}${imp.modele ? ` · analyse : ${imp.modele === "heuristique" ? "automatique sans IA" : imp.modele}` : ""}`}
        actions={
          <>
            <span className={cn("inline-flex h-10 items-center px-3 text-sm font-semibold", statut.classe)}>{statut.libelle}</span>
            {!imp.sourceSupprimee && (
              <a href={`/api/admin/imports/${imp.id}/pdf`} target="_blank" className={classesBouton.secondaire}>
                <FileText className="size-4" aria-hidden /> Ouvrir le PDF
              </a>
            )}
            <Link href="/admin/imports" className={classesBouton.secondaire}>
              <ArrowLeft className="size-4" aria-hidden /> Tous les imports
            </Link>
          </>
        }
      />

      {doublon && (
        <p className="mb-6 border border-or/50 bg-or-clair/40 px-4 py-3 text-sm">
          Ce fichier a déjà été importé : voici l&apos;import existant. Aucun doublon n&apos;a été créé.
        </p>
      )}

      {["TELEVERSE", "EN_ATTENTE", "EN_COURS", "ECHEC"].includes(imp.statut) && (
        <Carte titre={imp.statut === "ECHEC" ? "Le traitement a échoué" : "Traitement en cours"}>
          <SuiviImport importId={imp.id} initial={{ statut: imp.statut, etape: imp.etape, progression: imp.progression, erreur: imp.erreur }} />
        </Carte>
      )}

      {imp.statut === "A_VERIFIER" &&
        (resultat?.success ? (
          <RevueImport importId={imp.id} resultat={resultat.data} rubriques={rubriques} nbPages={imp.pages ?? 1} />
        ) : (
          <Carte titre="Résultat illisible">
            <p className="text-sm">Le résultat de l&apos;analyse ne peut pas être affiché. Relancez l&apos;analyse depuis la liste des imports.</p>
            <SuiviImport importId={imp.id} initial={{ statut: "ECHEC", etape: null, progression: 0, erreur: "Résultat d'analyse invalide." }} />
          </Carte>
        ))}

      {imp.statut === "TERMINE" && imp.article && (
        <Carte titre="Brouillon créé">
          <p className="text-sm">
            L&apos;article « {imp.article.titre} » a été créé à partir de ce PDF.
          </p>
          <Link href={`/admin/articles/${imp.article.id}`} className={cn(classesBouton.or, "mt-4")}>
            Ouvrir l&apos;article dans l&apos;éditeur
          </Link>
        </Carte>
      )}

      {imp.statut === "ANNULE" && (
        <Carte titre="Import annulé">
          <p className="text-sm text-texte-doux">{imp.erreur || "Cet import a été abandonné. Le PDF et les images extraites ont été supprimés."}</p>
        </Carte>
      )}
    </>
  );
}
