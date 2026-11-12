import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin";
import { donneesEditeur } from "@/lib/admin-donnees";
import { DOCUMENT_VIDE, type TiptapDoc } from "@/lib/content";
import { dateHeure } from "@/lib/format";
import { traductionAutoDisponible } from "@/lib/traduction";
import { supprimerTraduction } from "@/lib/actions/traductions";
import { EnTeteAdmin } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { classesBouton } from "@/components/admin/styles";
import { FormulaireTraduction } from "@/components/admin/formulaire-traduction";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Version anglaise" };

export default async function PageTraduction({ params }: PageProps<"/admin/articles/[id]/traduction">) {
  await exigerAdmin();
  const { id } = await params;
  const [article, { medias }] = await Promise.all([
    prisma.article.findUnique({ where: { id }, include: { traductions: { where: { langue: "en" } } } }),
    donneesEditeur(),
  ]);
  if (!article) notFound();
  const t = article.traductions[0];

  return (
    <>
      <EnTeteAdmin
        titre="Version anglaise"
        description={`« ${article.titre} » — ${t ? `traduction ${t.automatique ? "automatique, non relue" : "relue"}, modifiée le ${dateHeure(t.modifieLe)}` : "aucune traduction : les lecteurs anglophones voient la version française avec un lien de traduction"}`}
        actions={
          <>
            <Link href={`/admin/articles/${article.id}`} className={classesBouton.secondaire}>
              <ArrowLeft className="size-4" aria-hidden /> Version française
            </Link>
            {article.statut === "PUBLIE" && (
              <a href={`/en/article/${article.slug}`} target="_blank" className={classesBouton.secondaire}>
                <ExternalLink className="size-4" aria-hidden /> Voir en anglais
              </a>
            )}
            {t && (
              <BoutonAction action={supprimerTraduction.bind(null, article.id)} variante="danger" confirmation="Supprimer la version anglaise de cet article ?">
                <Trash2 className="size-4" aria-hidden /> Supprimer
              </BoutonAction>
            )}
          </>
        }
      />
      <FormulaireTraduction
        articleId={article.id}
        medias={medias}
        autoDisponible={traductionAutoDisponible()}
        initial={{
          titre: t?.titre ?? "",
          chapeau: t?.chapeau ?? "",
          contenu: (t?.contenu as unknown as TiptapDoc) ?? DOCUMENT_VIDE,
          relue: t ? !t.automatique : true,
        }}
      />
    </>
  );
}
