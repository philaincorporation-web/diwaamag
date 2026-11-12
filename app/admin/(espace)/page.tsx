import Link from "next/link";
import { Eye, FileText, Mail, MessageSquare, PenSquare, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { dateCourte, dateHeure } from "@/lib/format";
import { BadgeStatut, Carte, EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { classesBouton } from "@/components/admin/styles";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export default async function TableauDeBord({ searchParams }: PageProps<"/admin">) {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const { erreur } = await searchParams;
  const [parStatut, vues, abonnes, enAttente, derniers, commentaires, populaires, programmes] = await Promise.all([
    prisma.article.groupBy({ by: ["statut"], _count: true }),
    prisma.article.aggregate({ _sum: { vues: true } }),
    prisma.abonneNewsletter.count({ where: { confirme: true, desinscritLe: null } }),
    prisma.commentaire.count({ where: { statut: { in: ["EN_ATTENTE", "SIGNALE"] } } }),
    prisma.article.findMany({
      where: { statut: { not: "CORBEILLE" } },
      orderBy: { modifieLe: "desc" },
      take: 6,
      select: { id: true, titre: true, statut: true, modifieLe: true, rubrique: { select: { nom: true } } },
    }),
    prisma.commentaire.findMany({
      where: { statut: { in: ["EN_ATTENTE", "SIGNALE"] } },
      orderBy: { creeLe: "desc" },
      take: 5,
      select: { id: true, nom: true, message: true, statut: true, creeLe: true, article: { select: { titre: true } } },
    }),
    prisma.article.findMany({ where: { statut: "PUBLIE" }, orderBy: { vues: "desc" }, take: 5, select: { id: true, titre: true, vues: true, slug: true } }),
    prisma.article.findMany({ where: { statut: "PROGRAMME" }, orderBy: { dateProgrammee: "asc" }, take: 5, select: { id: true, titre: true, dateProgrammee: true } }),
  ]);
  const n = (s: string) => parStatut.find((x) => x.statut === s)?._count ?? 0;

  const stats = [
    { libelle: "Articles publiés", valeur: n("PUBLIE"), icone: FileText, href: "/admin/articles?statut=PUBLIE" },
    { libelle: "Brouillons", valeur: n("BROUILLON"), icone: PenSquare, href: "/admin/articles?statut=BROUILLON" },
    { libelle: "Lectures totales", valeur: vues._sum.vues ?? 0, icone: Eye, href: "/admin/articles" },
    { libelle: "Commentaires à modérer", valeur: enAttente, icone: MessageSquare, href: "/admin/commentaires" },
    { libelle: "Abonnés newsletter", valeur: abonnes, icone: Mail, href: "/admin/newsletter" },
  ];

  return (
    <>
      <EnTeteAdmin
        titre="Tableau de bord"
        description="Vue d'ensemble de l'activité éditoriale."
        actions={
          <Link href="/admin/articles/nouveau" className={classesBouton.or}>
            <Plus className="size-4" aria-hidden /> Nouvel article
          </Link>
        }
      />
      {erreur === "droits" && (
        <p className="mb-6 border-l-4 border-danger bg-danger/10 px-3 py-2 text-sm font-medium text-danger">Cette section est réservée au super-administrateur.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.libelle} href={s.href} className="group border border-ligne bg-fond p-5 transition-colors hover:border-or">
            <s.icone className="size-5 text-or-fonce" aria-hidden />
            <p className="mt-3 font-titre text-4xl">{s.valeur.toLocaleString("fr-FR")}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-texte-doux group-hover:text-encre">{s.libelle}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Carte titre="Derniers articles modifiés" actions={<Link href="/admin/articles" className={classesBouton.lien}>Tous</Link>}>
          {derniers.length === 0 ? (
            <Vide>Aucun article.</Vide>
          ) : (
            <ul className="divide-y divide-ligne">
              {derniers.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/articles/${a.id}`} className="line-clamp-1 font-semibold hover:text-or-fonce">{a.titre}</Link>
                    <p className="text-xs text-texte-doux">{a.rubrique.nom} · modifié le {dateHeure(a.modifieLe)}</p>
                  </div>
                  <BadgeStatut statut={a.statut} />
                </li>
              ))}
            </ul>
          )}
        </Carte>
        <Carte titre="Commentaires en attente" actions={<Link href="/admin/commentaires" className={classesBouton.lien}>Modérer</Link>}>
          {commentaires.length === 0 ? (
            <Vide>Rien à modérer. 🎉</Vide>
          ) : (
            <ul className="divide-y divide-ligne">
              {commentaires.map((c) => (
                <li key={c.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{c.nom}</p>
                    <BadgeStatut statut={c.statut} />
                  </div>
                  <p className="line-clamp-2 text-sm text-texte-doux">{c.message}</p>
                  <p className="mt-1 text-xs text-texte-doux">sur « {c.article.titre} » · {dateCourte(c.creeLe)}</p>
                </li>
              ))}
            </ul>
          )}
        </Carte>
        <Carte titre="Les plus lus">
          <ol className="space-y-2">
            {populaires.map((a, i) => (
              <li key={a.id} className="flex items-center gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center bg-or font-titre text-xs">{i + 1}</span>
                <a href={`/fr/article/${a.slug}`} target="_blank" className="line-clamp-1 flex-1 hover:text-or-fonce">{a.titre}</a>
                <span className="text-xs font-semibold text-texte-doux">{a.vues.toLocaleString("fr-FR")} vues</span>
              </li>
            ))}
          </ol>
        </Carte>
        <Carte titre="Publications programmées">
          {programmes.length === 0 ? (
            <Vide>Aucune publication programmée.</Vide>
          ) : (
            <ul className="space-y-2 text-sm">
              {programmes.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <Link href={`/admin/articles/${a.id}`} className="line-clamp-1 hover:text-or-fonce">{a.titre}</Link>
                  <span className="shrink-0 text-xs text-texte-doux">{dateHeure(a.dateProgrammee)}</span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>
    </>
  );
}
