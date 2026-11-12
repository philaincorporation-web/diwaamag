import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, History, Languages, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/db";
import { donneesEditeur } from "@/lib/admin-donnees";
import { dateHeure } from "@/lib/format";
import type { TiptapDoc } from "@/lib/content";
import { restaurerVersion } from "@/lib/actions/articles";
import { BadgeStatut, Carte, EnTeteAdmin } from "@/components/admin/presentation";
import { FormulaireArticle } from "@/components/admin/formulaire-article";
import { BoutonAction } from "@/components/admin/ui";
import { classesBouton } from "@/components/admin/styles";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Modifier l'article" };

export default async function ModifierArticle({ params, searchParams }: PageProps<"/admin/articles/[id]">) {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const [{ id }, { cree, restaure, import: importe }] = await Promise.all([params, searchParams]);
  const [article, d, versions] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: { motsCles: { include: { motCle: true } }, auteur: { select: { nom: true } }, traductions: { where: { langue: "en" }, select: { automatique: true } } },
    }),
    donneesEditeur(),
    prisma.articleVersion.findMany({
      where: { articleId: id },
      orderBy: { creeLe: "desc" },
      take: 20,
      select: { id: true, titre: true, creeLe: true, modifiePar: { select: { nom: true } } },
    }),
  ]);
  if (!article) notFound();

  return (
    <>
      <EnTeteAdmin
        titre="Modifier l'article"
        description={`Par ${article.auteur.nom} · créé le ${dateHeure(article.creeLe)}${article.datePublication ? ` · publié le ${dateHeure(article.datePublication)}` : ""}`}
        actions={
          <>
            <BadgeStatut statut={article.statut} />
            <Link href={`/admin/articles/${article.id}/traduction`} className={classesBouton.secondaire}>
              <Languages className="size-4" aria-hidden /> Version anglaise{" "}
              <span className={article.traductions[0] ? (article.traductions[0].automatique ? "text-amber-700" : "text-succes") : "text-danger"}>
                ({article.traductions[0] ? (article.traductions[0].automatique ? "auto" : "relue") : "absente"})
              </span>
            </Link>
            {article.statut === "PUBLIE" && (
              <a href={`/fr/article/${article.slug}`} target="_blank" className={classesBouton.secondaire}>
                <ExternalLink className="size-4" aria-hidden /> Voir en ligne
              </a>
            )}
          </>
        }
      />
      {cree && <p className="mb-6 border-l-4 border-succes bg-succes/10 px-3 py-2 text-sm font-medium text-succes">Article créé.</p>}
      {importe && (
        <p className="mb-6 border-l-4 border-succes bg-succes/10 px-3 py-2 text-sm font-medium text-succes">
          Brouillon créé depuis le PDF. Relisez-le, vérifiez l&apos;aperçu, puis publiez-le quand il est prêt : rien n&apos;a été mis en ligne.
        </p>
      )}
      {article.statut === "CORBEILLE" && (
        <p className="mb-6 border-l-4 border-danger bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          Cet article est dans la corbeille. Restaurez-le depuis <Link href="/admin/articles?statut=CORBEILLE" className="underline">la liste</Link> pour le modifier.
        </p>
      )}
      {restaure && <p className="mb-6 border-l-4 border-succes bg-succes/10 px-3 py-2 text-sm font-medium text-succes">Version restaurée.</p>}
      <FormulaireArticle
        key={typeof restaure === "string" ? restaure : "edition"}
        {...d}
        article={{
          id: article.id,
          titre: article.titre,
          slug: article.slug,
          chapeau: article.chapeau,
          contenu: article.contenu as unknown as TiptapDoc,
          rubriqueId: article.rubriqueId,
          type: article.type,
          motsCles: article.motsCles.map((m) => m.motCle.nom).join(", "),
          imageUneUrl: article.imageUneUrl ?? "",
          imageUneAlt: article.imageUneAlt ?? "",
          videoUrl: article.videoUrl ?? "",
          aLaUne: article.aLaUne,
          metaTitre: article.metaTitre ?? "",
          metaDescription: article.metaDescription ?? "",
          dateProgrammee: article.dateProgrammee?.toISOString() ?? "",
          statut: article.statut,
        }}
      />
      <Carte titre="Historique des versions" className="mt-8" actions={<History className="size-4 text-texte-doux" aria-hidden />}>
        <ul className="divide-y divide-ligne text-sm">
          {versions.map((v, i) => (
            <li key={v.id} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="line-clamp-1 font-medium">{v.titre}</p>
                <p className="text-xs text-texte-doux">{dateHeure(v.creeLe)} · {v.modifiePar.nom}{i === 0 && " · version actuelle"}</p>
              </div>
              {i > 0 && (
                <BoutonAction action={restaurerVersion.bind(null, v.id)} confirmation="Restaurer cette version du titre et du contenu ?" className="h-8 px-3">
                  <RotateCcw className="size-4" aria-hidden /> Restaurer
                </BoutonAction>
              )}
            </li>
          ))}
        </ul>
      </Carte>
    </>
  );
}
