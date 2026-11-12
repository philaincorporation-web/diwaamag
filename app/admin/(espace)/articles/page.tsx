import Link from "next/link";
import { Archive, ExternalLink, FileUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { dateCourte, LIBELLES_STATUT, LIBELLES_TYPE } from "@/lib/format";
import { changerStatut, supprimerDefinitivement, viderCorbeille } from "@/lib/actions/articles";
import { BadgeStatut, EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { classesBouton, classesChamp } from "@/components/admin/styles";
import type { Prisma, StatutArticle } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/cn";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

const STATUTS = ["PUBLIE", "PROGRAMME", "BROUILLON", "ARCHIVE", "CORBEILLE"] as const;

export default async function ListeArticlesAdmin({ searchParams }: PageProps<"/admin/articles">) {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const sp = await searchParams;
  const statut = STATUTS.includes(sp.statut as StatutArticle) ? (sp.statut as StatutArticle) : undefined;
  const rubrique = typeof sp.rubrique === "string" ? sp.rubrique : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const where: Prisma.ArticleWhereInput = {
    statut: statut ?? { not: "CORBEILLE" },
    rubriqueId: rubrique || undefined,
    titre: q ? { contains: q, mode: "insensitive" } : undefined,
  };
  const [admin, articles, rubriques, compteurs] = await Promise.all([
    getAdmin(),
    prisma.article.findMany({
      where,
      orderBy: [{ modifieLe: "desc" }],
      take: 100,
      select: {
        id: true,
        titre: true,
        slug: true,
        statut: true,
        type: true,
        aLaUne: true,
        vues: true,
        datePublication: true,
        dateProgrammee: true,
        modifieLe: true,
        rubrique: { select: { nom: true } },
        auteur: { select: { nom: true } },
        _count: { select: { commentaires: true } },
        traductions: { where: { langue: "en" }, select: { automatique: true } },
      },
    }),
    prisma.rubrique.findMany({ orderBy: [{ famille: "asc" }, { ordre: "asc" }] }),
    prisma.article.groupBy({ by: ["statut"], _count: true }),
  ]);
  const n = (s: string) => compteurs.find((c) => c.statut === s)?._count ?? 0;
  const lienFiltre = (s?: string) => `/admin/articles${s ? `?statut=${s}` : ""}`;

  return (
    <>
      <EnTeteAdmin
        titre="Articles"
        description="Rédaction, publication, programmation et archivage."
        actions={
          <>
            {statut === "CORBEILLE" && admin?.role === "SUPER_ADMIN" && n("CORBEILLE") > 0 && (
              <BoutonAction action={viderCorbeille} variante="danger" confirmation="Supprimer définitivement tous les articles de la corbeille ? Cette action est irréversible.">
                <Trash2 className="size-4" aria-hidden /> Vider la corbeille
              </BoutonAction>
            )}
            <Link href="/admin/imports" className={classesBouton.secondaire}>
              <FileUp className="size-4" aria-hidden /> Importer un PDF
            </Link>
            <Link href="/admin/articles/nouveau" className={classesBouton.or}>
              <Plus className="size-4" aria-hidden /> Nouvel article
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 text-sm">
        <Link href={lienFiltre()} className={cn("px-3 py-1.5 font-semibold", !statut ? "bg-noir text-white" : "bg-fond hover:bg-or/20")}>
          Tous ({compteurs.filter((c) => c.statut !== "CORBEILLE").reduce((s, c) => s + c._count, 0)})
        </Link>
        {STATUTS.map((s) => (
          <Link key={s} href={lienFiltre(s)} className={cn("px-3 py-1.5 font-semibold", statut === s ? "bg-noir text-white" : "bg-fond hover:bg-or/20")}>
            {LIBELLES_STATUT[s]} ({n(s)})
          </Link>
        ))}
      </div>

      <form className="mb-6 flex flex-wrap gap-2" action="/admin/articles">
        {statut && <input type="hidden" name="statut" value={statut} />}
        <input name="q" defaultValue={q} placeholder="Rechercher un titre…" className={cn(classesChamp, "max-w-xs")} aria-label="Rechercher un titre" />
        <select name="rubrique" defaultValue={rubrique ?? ""} className={cn(classesChamp, "max-w-56")} aria-label="Filtrer par rubrique">
          <option value="">Toutes les rubriques</option>
          {rubriques.map((r) => (
            <option key={r.id} value={r.id}>{r.nom}</option>
          ))}
        </select>
        <button className={classesBouton.secondaire}>Filtrer</button>
      </form>

      <div className="overflow-x-auto border border-ligne bg-fond">
        {articles.length === 0 ? (
          <Vide>Aucun article ne correspond.</Vide>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-ligne bg-fond-2 text-left text-xs uppercase tracking-wide text-texte-doux">
              <tr>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Rubrique</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Vues</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ligne">
              {articles.map((a) => (
                <tr key={a.id} className="align-top hover:bg-fond-2/60">
                  <td className="max-w-md px-4 py-3">
                    <Link href={`/admin/articles/${a.id}`} className="font-semibold hover:text-or-fonce">{a.titre}</Link>
                    <p className="mt-0.5 text-xs text-texte-doux">
                      {LIBELLES_TYPE[a.type]} · {a.auteur.nom} · {a._count.commentaires} commentaire(s){a.aLaUne && <span className="ml-1 font-bold text-or-fonce">★ À la une</span>}
                      <Link href={`/admin/articles/${a.id}/traduction`} className={cn("ml-2 rounded px-1 font-bold", a.traductions[0] ? (a.traductions[0].automatique ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700") : "bg-red-50 text-red-700")} title="Version anglaise">
                        EN{a.traductions[0] ? (a.traductions[0].automatique ? " auto" : " ✓") : " —"}
                      </Link>
                    </p>
                  </td>
                  <td className="px-4 py-3 text-texte-doux">{a.rubrique.nom}</td>
                  <td className="px-4 py-3"><BadgeStatut statut={a.statut} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-texte-doux">
                    {a.statut === "PROGRAMME" ? `Prévu le ${dateCourte(a.dateProgrammee)}` : a.datePublication ? dateCourte(a.datePublication) : `Modifié le ${dateCourte(a.modifieLe)}`}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{a.vues.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {a.statut === "PUBLIE" && (
                        <a href={`/fr/article/${a.slug}`} target="_blank" className={cn(classesBouton.secondaire, "h-8 px-2")} title="Voir en ligne" aria-label="Voir en ligne">
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                      {a.statut === "PUBLIE" && (
                        <BoutonAction action={changerStatut.bind(null, a.id, "ARCHIVE")} className="h-8 px-2" titre="Archiver" confirmation="Archiver cet article ? Il ne sera plus visible sur le site.">
                          <Archive className="size-4" />
                        </BoutonAction>
                      )}
                      {(a.statut === "ARCHIVE" || a.statut === "CORBEILLE") && (
                        <BoutonAction action={changerStatut.bind(null, a.id, "BROUILLON")} className="h-8 px-2" titre="Restaurer en brouillon">
                          <RotateCcw className="size-4" />
                        </BoutonAction>
                      )}
                      {a.statut !== "CORBEILLE" ? (
                        <BoutonAction action={changerStatut.bind(null, a.id, "CORBEILLE")} variante="danger" className="h-8 px-2" titre="Mettre à la corbeille" confirmation="Mettre cet article à la corbeille ?">
                          <Trash2 className="size-4" />
                        </BoutonAction>
                      ) : (
                        admin?.role === "SUPER_ADMIN" && (
                          <BoutonAction action={supprimerDefinitivement.bind(null, a.id)} variante="danger" className="h-8 px-2" titre="Supprimer définitivement" confirmation="Supprimer définitivement cet article ? Cette action est irréversible.">
                            <Trash2 className="size-4" /> Définitif
                          </BoutonAction>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
