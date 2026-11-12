import type { Metadata } from "next";
import Link from "next/link";
import { Check, ExternalLink, Flag, Trash2, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { dateHeure } from "@/lib/format";
import { modererCommentaire, supprimerCommentaire } from "@/lib/actions/gestion";
import { BadgeStatut, EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { ReponseRedaction } from "@/components/admin/formulaires";
import type { StatutCommentaire } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/cn";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Commentaires" };

const FILTRES = [
  { cle: "attente", libelle: "À modérer", statuts: ["EN_ATTENTE", "SIGNALE"] as StatutCommentaire[] },
  { cle: "approuves", libelle: "Approuvés", statuts: ["APPROUVE"] as StatutCommentaire[] },
  { cle: "rejetes", libelle: "Rejetés", statuts: ["REJETE"] as StatutCommentaire[] },
];

export default async function PageCommentaires({ searchParams }: PageProps<"/admin/commentaires">) {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const { filtre } = await searchParams;
  const f = FILTRES.find((x) => x.cle === filtre) ?? FILTRES[0];
  const commentaires = await prisma.commentaire.findMany({
    where: { statut: { in: f.statuts } },
    orderBy: [{ signalements: "desc" }, { creeLe: "desc" }],
    take: 100,
    include: { article: { select: { titre: true, slug: true } }, parent: { select: { nom: true } } },
  });
  // Historique de chaque adresse pour aider la décision.
  const historique = await prisma.commentaire.groupBy({
    by: ["email"],
    where: { email: { in: [...new Set(commentaires.map((c) => c.email))] }, statut: "APPROUVE" },
    _count: true,
  });
  const approuves = (email: string) => historique.find((h) => h.email === email)?._count ?? 0;

  return (
    <>
      <EnTeteAdmin titre="Commentaires" description="Premier commentaire d'une adresse et commentaires avec lien : validation manuelle. Les commentaires signalés 3 fois sont retirés du site." />
      <div className="mb-6 flex gap-1 text-sm">
        {FILTRES.map((x) => (
          <Link key={x.cle} href={`/admin/commentaires?filtre=${x.cle}`} className={cn("px-3 py-1.5 font-semibold", x.cle === f.cle ? "bg-noir text-white" : "bg-fond hover:bg-or/20")}>
            {x.libelle}
          </Link>
        ))}
      </div>
      {commentaires.length === 0 ? (
        <div className="border border-ligne bg-fond"><Vide>Aucun commentaire dans cette file.</Vide></div>
      ) : (
        <ul className="space-y-3">
          {commentaires.map((c) => (
            <li key={c.id} className={cn("border bg-fond p-5", c.statut === "SIGNALE" ? "border-danger/40" : "border-ligne")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {c.nom} <span className="text-sm font-normal text-texte-doux">&lt;{c.email}&gt;</span>
                  </p>
                  <p className="text-xs text-texte-doux">
                    {dateHeure(c.creeLe)} · {approuves(c.email)} commentaire(s) déjà approuvé(s){c.adresseIp ? ` · IP ${c.adresseIp}` : ""}
                    {c.parent && ` · en réponse à ${c.parent.nom}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.signalements > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-danger"><Flag className="size-3.5" aria-hidden /> {c.signalements}</span>
                  )}
                  <BadgeStatut statut={c.statut} />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-[15px]">{c.message}</p>
              {c.lien && (
                <p className="mt-2 text-sm">
                  Lien proposé : <a href={c.lien} target="_blank" rel="noopener nofollow" className="break-all font-medium text-or-fonce underline">{c.lien}</a>
                </p>
              )}
              <p className="mt-2 text-xs text-texte-doux">
                Sur <a href={`/fr/article/${c.article.slug}#commentaires`} target="_blank" className="inline-flex items-center gap-1 font-medium hover:text-or-fonce">« {c.article.titre} » <ExternalLink className="size-3" aria-hidden /></a>
              </p>
              <div className="mt-4 flex flex-wrap items-start gap-2">
                {c.statut !== "APPROUVE" && (
                  <BoutonAction action={modererCommentaire.bind(null, c.id, "APPROUVE")} variante="principal" className="h-8 px-3">
                    <Check className="size-4" aria-hidden /> Approuver
                  </BoutonAction>
                )}
                {c.statut !== "REJETE" && (
                  <BoutonAction action={modererCommentaire.bind(null, c.id, "REJETE")} className="h-8 px-3">
                    <X className="size-4" aria-hidden /> Rejeter
                  </BoutonAction>
                )}
                <BoutonAction action={supprimerCommentaire.bind(null, c.id)} variante="danger" className="h-8 px-3" confirmation="Supprimer définitivement ce commentaire ?">
                  <Trash2 className="size-4" aria-hidden /> Supprimer
                </BoutonAction>
                <ReponseRedaction commentaireId={c.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
