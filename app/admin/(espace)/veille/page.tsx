import type { Metadata } from "next";
import Form from "next/form";
import { Download, Eye, EyeOff, ExternalLink, Pause, Play, RefreshCw, Search, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin";
import { dateHeure } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ZONES, type ZoneVeilleCle } from "@/lib/veille/defauts";
import {
  basculerCategorieVeille,
  basculerSourceVeille,
  collecterVeilleMaintenant,
  installerVeilleRecommandee,
  masquerActualiteVeille,
  supprimerActualiteVeille,
  supprimerSourceVeille,
} from "@/lib/actions/veille";
import { Carte, EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { classesBouton, classesChamp } from "@/components/admin/styles";
import { EditionCategorie, EditionSource, FormulaireCategorie, FormulaireSource } from "@/components/admin/veille";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;
// La collecte manuelle lit toutes les sources : jusqu'à 5 minutes.
export const maxDuration = 300;
export const metadata: Metadata = { title: "Veille Média" };

export default async function PageVeilleAdmin({ searchParams }: PageProps<"/admin/veille">) {
  await exigerAdmin();
  const { q } = await searchParams;
  const recherche = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const [sources, categories, actualites, total, masquees, abonnes] = await Promise.all([
    prisma.sourceVeille.findMany({ orderBy: [{ actif: "desc" }, { nom: "asc" }], include: { _count: { select: { actualites: true } } } }),
    prisma.categorieVeille.findMany({ orderBy: { ordre: "asc" } }),
    prisma.actualiteVeille.findMany({
      where: recherche ? { OR: [{ titre: { contains: recherche, mode: "insensitive" } }, { source: { nom: { contains: recherche, mode: "insensitive" } } }] } : {},
      orderBy: { datePublication: "desc" },
      take: 60,
      include: { source: { select: { nom: true } } },
    }),
    prisma.actualiteVeille.count(),
    prisma.actualiteVeille.count({ where: { masquee: true } }),
    prisma.abonnementPush.count({ where: { veille: true } }),
  ]);
  const zones = (Object.keys(ZONES) as ZoneVeilleCle[]).filter((z) => z !== "NON_PRECISE").map((cle) => ({ cle, nom: ZONES[cle].fr }));
  const cats = categories.map((c) => ({ slug: c.slug, nom: c.nom }));
  const nomCategorie = new Map(categories.map((c) => [c.slug, c.nom]));
  const enErreur = sources.filter((s) => s.actif && s.dernierStatut === "erreur").length;

  return (
    <>
      <EnTeteAdmin
        titre="Veille Média"
        description="Actualités technologiques collectées automatiquement depuis des flux RSS (dont Google Alerts), classées par catégorie et par zone, avec notifications ciblées pour les lecteurs abonnés."
        actions={
          <>
            <BoutonAction action={collecterVeilleMaintenant.bind(null, undefined)} variante="or">
              <RefreshCw className="size-4" aria-hidden /> Collecter maintenant
            </BoutonAction>
            <a href="/fr/veille" target="_blank" className={classesBouton.secondaire}>
              <ExternalLink className="size-4" aria-hidden /> Voir la page
            </a>
          </>
        }
      />

      <dl className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          ["Sources actives", `${sources.filter((s) => s.actif).length} / ${sources.length}`],
          ["Sources en erreur", String(enErreur)],
          ["Actualités (masquées)", `${total} (${masquees})`],
          ["Abonnés à la veille", String(abonnes)],
        ].map(([l, v]) => (
          <div key={l} className="border border-ligne bg-fond p-4">
            <dt className="text-xs uppercase tracking-wide text-texte-doux">{l}</dt>
            <dd className={cn("mt-1 font-titre text-3xl", l === "Sources en erreur" && enErreur > 0 && "text-danger")}>{v}</dd>
          </div>
        ))}
      </dl>

      {(sources.length === 0 || categories.length === 0) && (
        <Carte titre="Démarrage" className="mb-8">
          <p className="mb-4 text-sm">
            Installez les 12 catégories et les 18 sources recommandées (flux vérifiés : TechCrunch, The Verge, Wired, MIT Technology Review, BBC, Rest of World, Le Monde Pixels, 01net, ZDNet, TechCabal,
            Disrupt Africa, Tech In Africa, CIO Mag, Digital Business Africa, Gabonreview, Gabonactu, BBC Afrique, Financial Afrik). Rien d&apos;existant n&apos;est modifié.
          </p>
          <BoutonAction action={installerVeilleRecommandee} variante="or">
            <Download className="size-4" aria-hidden /> Installer les sources et catégories recommandées
          </BoutonAction>
        </Carte>
      )}

      <Carte titre={`Sources (${sources.length})`} className="mb-8">
        <div className="mb-6 border-b border-ligne pb-6">
          <FormulaireSource zones={zones} categories={cats} />
        </div>
        {sources.length === 0 ? (
          <Vide>Aucune source.</Vide>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-ligne text-left text-xs uppercase tracking-wide text-texte-doux">
                  <th className="py-2 pr-3 font-semibold">Source</th>
                  <th className="py-2 pr-3 font-semibold">Réglages</th>
                  <th className="py-2 pr-3 font-semibold">Dernier relevé</th>
                  <th className="py-2 pr-3 text-right font-semibold">Actualités</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ligne">
                {sources.map((s) => (
                  <tr key={s.id} className={cn(!s.actif && "opacity-55")}>
                    <td className="max-w-72 py-3 pr-3">
                      <p className="font-semibold">{s.nom}</p>
                      <a href={s.url} target="_blank" rel="noopener" className="block truncate text-xs text-texte-doux hover:text-or-fonce">{s.url}</a>
                    </td>
                    <td className="py-3 pr-3 text-xs text-texte-doux">
                      {s.langue.toUpperCase()} · {s.zoneParDefaut ? ZONES[s.zoneParDefaut as ZoneVeilleCle].fr : "zone auto"}
                      {s.categorieParDefaut ? ` · ${nomCategorie.get(s.categorieParDefaut) ?? s.categorieParDefaut}` : ""}
                      {s.filtrerTech && <span className="block font-semibold text-or-fonce">tech uniquement</span>}
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      {!s.dernierReleve ? (
                        <span className="text-texte-doux">jamais</span>
                      ) : (
                        <>
                          <span className={cn("inline-block px-1.5 font-semibold", s.dernierStatut === "ok" ? "bg-succes/10 text-succes" : "bg-danger/10 text-danger")}>
                            {s.dernierStatut === "ok" ? `OK · +${s.derniersAjouts ?? 0}` : `Erreur${s.echecsConsecutifs > 1 ? ` (${s.echecsConsecutifs}×)` : ""}`}
                          </span>
                          <span className="block text-texte-doux">{dateHeure(s.dernierReleve)}</span>
                          {s.derniereErreur && <span className="block text-danger">{s.derniereErreur}</span>}
                        </>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">{s._count.actualites}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        <EditionSource source={s} zones={zones} categories={cats} />
                        <BoutonAction action={collecterVeilleMaintenant.bind(null, s.id)} className="h-8 px-2" titre="Relever cette source maintenant">
                          <RefreshCw className="size-4" />
                        </BoutonAction>
                        <BoutonAction action={basculerSourceVeille.bind(null, s.id)} className="h-8 px-2" titre={s.actif ? "Désactiver" : "Activer"}>
                          {s.actif ? <Pause className="size-4" /> : <Play className="size-4" />}
                        </BoutonAction>
                        <BoutonAction action={supprimerSourceVeille.bind(null, s.id)} confirmation={`Supprimer la source « ${s.nom} » et ses ${s._count.actualites} actualité(s) ?`} variante="danger" className="h-8 px-2" titre="Supprimer">
                          <Trash2 className="size-4" />
                        </BoutonAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>

      <Carte titre={`Catégories (${categories.length})`} className="mb-8">
        <ul className="mb-6 divide-y divide-ligne">
          {categories.map((c) => (
            <li key={c.id} className={cn("flex flex-wrap items-center justify-between gap-3 py-3", !c.actif && "opacity-55")}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {c.nom} <span className="font-normal text-texte-doux">/ {c.nomEn}</span>
                </p>
                <p className="truncate text-xs text-texte-doux">{c.motsCles.length} mots-clés : {c.motsCles.slice(0, 10).join(", ")}…</p>
              </div>
              <div className="flex gap-1">
                <EditionCategorie categorie={c} />
                <BoutonAction action={basculerCategorieVeille.bind(null, c.id)} className="h-8 px-2" titre={c.actif ? "Masquer" : "Réactiver"}>
                  {c.actif ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </BoutonAction>
              </div>
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-or-fonce">Ajouter une catégorie</summary>
          <div className="mt-4">
            <FormulaireCategorie />
          </div>
        </details>
      </Carte>

      <Carte titre="Actualités collectées">
        <Form action="/admin/veille" className="mb-4 flex gap-2">
          <input name="q" defaultValue={recherche} placeholder="Rechercher un titre ou une source" className={classesChamp} />
          <button className={classesBouton.secondaire}>
            <Search className="size-4" aria-hidden /> Chercher
          </button>
        </Form>
        {actualites.length === 0 ? (
          <Vide>Aucune actualité. Lancez une collecte.</Vide>
        ) : (
          <ul className="divide-y divide-ligne">
            {actualites.map((a) => (
              <li key={a.id} className={cn("flex flex-wrap items-start justify-between gap-3 py-3", a.masquee && "opacity-50")}>
                <div className="min-w-0 flex-1">
                  <a href={a.url} target="_blank" rel="noopener" className="font-semibold hover:text-or-fonce">
                    {a.titre}
                  </a>
                  <p className="text-xs text-texte-doux">
                    {a.source.nom} · {dateHeure(a.datePublication)} · {a.categories.map((c) => nomCategorie.get(c) ?? c).join(", ") || "sans catégorie"} · {ZONES[a.zone as ZoneVeilleCle].fr}
                    {a.masquee && <strong className="ml-1 text-danger">masquée</strong>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <BoutonAction action={masquerActualiteVeille.bind(null, a.id, !a.masquee)} className="h-8 px-2" titre={a.masquee ? "Afficher" : "Masquer"}>
                    {a.masquee ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </BoutonAction>
                  <BoutonAction action={supprimerActualiteVeille.bind(null, a.id)} confirmation="Supprimer définitivement cette actualité ?" variante="danger" className="h-8 px-2" titre="Supprimer">
                    <Trash2 className="size-4" />
                  </BoutonAction>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </>
  );
}
