import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin";
import { dateHeure } from "@/lib/format";
import { IMPORT_PDF, analyseIaDisponible } from "@/lib/import-pdf/config";
import { libererTraitementsBloques } from "@/lib/import-pdf/traitement";
import { Carte, EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { ZoneImport } from "@/components/admin/import-pdf";
import { cn } from "@/lib/cn";
import { LIBELLES_IMPORT } from "@/lib/import-pdf/libelles";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Import PDF" };

export default async function PageImports() {
  await exigerAdmin();
  await libererTraitementsBloques();
  const imports = await prisma.importPdf.findMany({
    orderBy: { creeLe: "desc" },
    take: 50,
    select: { id: true, nomFichier: true, statut: true, pages: true, creeLe: true, admin: { select: { nom: true } }, article: { select: { id: true, titre: true } } },
  });
  return (
    <>
      <EnTeteAdmin
        titre="Importer un article depuis un PDF"
        description="Déposez un article déjà maquetté (Canva, InDesign…) : texte, intertitres, citations et images sont extraits, puis vous vérifiez tout avant de créer un brouillon. Rien n'est publié automatiquement."
      />
      <Carte titre="Nouveau PDF" className="mb-8">
        <ZoneImport tailleMaxMo={IMPORT_PDF.tailleMaxMo} pagesMax={IMPORT_PDF.pagesMax} iaActive={analyseIaDisponible()} />
      </Carte>
      <Carte titre="Imports récents">
        {imports.length === 0 ? (
          <Vide>Aucun import pour l&apos;instant.</Vide>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ligne text-left text-xs uppercase tracking-wide text-texte-doux">
                  <th className="py-2 pr-3 font-semibold">Fichier</th>
                  <th className="py-2 pr-3 font-semibold">État</th>
                  <th className="py-2 pr-3 font-semibold">Par</th>
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 font-semibold">Article</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ligne">
                {imports.map((i) => {
                  const s = LIBELLES_IMPORT[i.statut];
                  return (
                    <tr key={i.id}>
                      <td className="py-3 pr-3">
                        <Link href={`/admin/imports/${i.id}`} className="font-semibold hover:text-or-fonce">
                          {i.nomFichier}
                        </Link>
                        {i.pages ? <span className="block text-xs text-texte-doux">{i.pages} page(s)</span> : null}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={cn("px-2 py-0.5 text-xs font-semibold", s.classe)}>{s.libelle}</span>
                      </td>
                      <td className="py-3 pr-3">{i.admin.nom}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{dateHeure(i.creeLe)}</td>
                      <td className="py-3">
                        {i.article ? (
                          <Link href={`/admin/articles/${i.article.id}`} className="text-or-fonce hover:text-encre">
                            {i.article.titre}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Carte>
    </>
  );
}
