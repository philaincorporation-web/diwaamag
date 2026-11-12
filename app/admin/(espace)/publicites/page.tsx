import type { Metadata } from "next";
import Image from "next/image";
import { Download, ExternalLink, Mail, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin";
import { dateHeure } from "@/lib/format";
import { imageOptimisable } from "@/lib/images";
import { cn } from "@/lib/cn";
import { EMPLACEMENTS_PUB } from "@/lib/publicite-emplacements";
import { basculerPublicite, marquerDemandeAnnonceur, reinitialiserStatsPublicite, supprimerDemandeAnnonceur, supprimerPublicite } from "@/lib/actions/publicites";
import { Carte, EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { classesBouton } from "@/components/admin/styles";
import { EditionPublicite, FormulairePublicite, type PubliciteFormulaire } from "@/components/admin/publicites";
import type { MediaLeger } from "@/components/admin/mediatheque";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;
export const metadata: Metadata = { title: "Publicités" };

/** Date au format du champ <input type="date">, à l'heure de Libreville. */
const jour = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Libreville" }).format(d) : "");
const nombre = (n: number) => n.toLocaleString("fr-FR");

function statut(p: { actif: boolean; debut: Date | null; fin: Date | null }, maintenant: number) {
  if (!p.actif) return { libelle: "Suspendue", classe: "bg-fond-2 text-texte-doux" };
  if (p.fin && p.fin.getTime() <= maintenant) return { libelle: "Terminée", classe: "bg-fond-2 text-texte-doux" };
  if (p.debut && p.debut.getTime() > maintenant) return { libelle: "Programmée", classe: "bg-or-clair text-or-fonce" };
  return { libelle: "En ligne", classe: "bg-succes/10 text-succes" };
}

/** Heure de référence du rendu (page dynamique, recalculée à chaque requête). */
function instantPresent() {
  return Date.now();
}

const OFFRES: Record<string, string> = {
  "pack-awards": "Pack DigieWomen Awards",
  rubrique: "Sponsor de rubrique",
  bannieres: "Bannières",
  "contenu-partenaire": "Contenu partenaire",
  "newsletter-whatsapp": "Newsletter / WhatsApp",
  annonces: "Annonces emploi / formation",
  video: "Vidéo",
  autre: "Autre",
};

export default async function PagePublicites() {
  await exigerAdmin();
  const [pubs, demandes, medias] = await Promise.all([
    prisma.publicite.findMany({ orderBy: [{ actif: "desc" }, { creeLe: "desc" }] }),
    prisma.demandeAnnonceur.findMany({ orderBy: [{ traitee: "asc" }, { creeLe: "desc" }], take: 100 }),
    prisma.media.findMany({ orderBy: { creeLe: "desc" }, take: 120, select: { id: true, url: true, type: true, texteAlternatif: true, legende: true } }),
  ]);
  const maintenant = instantPresent();
  const enLigne = pubs.filter((p) => statut(p, maintenant).libelle === "En ligne");
  const totalAffichages = pubs.reduce((s, p) => s + p.affichages, 0);
  const totalClics = pubs.reduce((s, p) => s + p.clics, 0);
  const aTraiter = demandes.filter((d) => !d.traitee).length;

  return (
    <>
      <EnTeteAdmin
        titre="Publicités"
        description="Campagnes des annonceurs : bannières, mur des partenaires et newsletter. Chaque bannière est signalée « Publicité » ; affichages et clics sont comptés pour les bilans."
        actions={
          <>
            <a href="/api/admin/publicites.csv" className={classesBouton.secondaire}>
              <Download className="size-4" aria-hidden /> Bilan (CSV)
            </a>
            <a href="/fr/annonceurs" target="_blank" className={classesBouton.secondaire}>
              <ExternalLink className="size-4" aria-hidden /> Page Annonceurs
            </a>
          </>
        }
      />

      <dl className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          ["Campagnes en ligne", nombre(enLigne.length)],
          ["Affichages (total)", nombre(totalAffichages)],
          ["Clics (total)", nombre(totalClics)],
          ["Demandes à traiter", nombre(aTraiter)],
        ].map(([l, v]) => (
          <div key={l} className="border border-ligne bg-fond p-4">
            <dt className="text-xs uppercase tracking-wide text-texte-doux">{l}</dt>
            <dd className="mt-1 font-titre text-3xl">{v}</dd>
          </div>
        ))}
      </dl>

      <Carte titre="Nouvelle campagne" className="mb-8">
        <FormulairePublicite medias={medias as MediaLeger[]} />
      </Carte>

      <Carte titre={`Campagnes (${pubs.length})`} className="mb-8">
        {pubs.length === 0 ? (
          <Vide>Aucune campagne. Sans campagne en haut de page, la bannière DigieWomen Awards reste affichée.</Vide>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-ligne text-left text-xs uppercase tracking-wide text-texte-doux">
                  <th className="py-2 pr-3 font-semibold">Bannière</th>
                  <th className="py-2 pr-3 font-semibold">Campagne</th>
                  <th className="py-2 pr-3 font-semibold">Emplacement</th>
                  <th className="py-2 pr-3 font-semibold">Période</th>
                  <th className="py-2 pr-3 text-right font-semibold">Affichages</th>
                  <th className="py-2 pr-3 text-right font-semibold">Clics</th>
                  <th className="py-2 pr-3 text-right font-semibold">Taux de clic</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ligne">
                {pubs.map((p) => {
                  const s = statut(p, maintenant);
                  const edition: PubliciteFormulaire = {
                    id: p.id,
                    nom: p.nom,
                    annonceur: p.annonceur,
                    emplacement: p.emplacement,
                    imageUrl: p.imageUrl,
                    imageAlt: p.imageAlt,
                    lien: p.lien,
                    debut: jour(p.debut),
                    fin: jour(p.fin),
                    poids: p.poids,
                    actif: p.actif,
                  };
                  return (
                    <tr key={p.id} className={cn(!p.actif && "opacity-60")}>
                      <td className="py-3 pr-3">
                        <div className="relative h-12 w-32 bg-fond-2">
                          <Image src={p.imageUrl} unoptimized={!imageOptimisable(p.imageUrl)} alt={p.imageAlt} fill sizes="128px" className="object-contain" />
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold">{p.nom}</p>
                        <p className="text-xs text-texte-doux">
                          {p.annonceur} · poids {p.poids}
                        </p>
                        <span className={cn("mt-1 inline-block px-2 py-0.5 text-xs font-semibold", s.classe)}>{s.libelle}</span>
                      </td>
                      <td className="py-3 pr-3">{EMPLACEMENTS_PUB[p.emplacement].libelle}</td>
                      <td className="py-3 pr-3 text-xs">
                        {p.debut ? `du ${jour(p.debut)}` : "dès maintenant"}
                        <br />
                        {p.fin ? `au ${jour(p.fin)}` : "sans fin"}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">{nombre(p.affichages)}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{nombre(p.clics)}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{p.affichages ? `${((p.clics / p.affichages) * 100).toFixed(2).replace(".", ",")} %` : "—"}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          <EditionPublicite pub={edition} medias={medias as MediaLeger[]} />
                          <BoutonAction action={basculerPublicite.bind(null, p.id)} className="h-8 px-2" titre={p.actif ? "Suspendre" : "Activer"}>
                            {p.actif ? <Pause className="size-4" /> : <Play className="size-4" />}
                          </BoutonAction>
                          <BoutonAction action={reinitialiserStatsPublicite.bind(null, p.id)} confirmation="Remettre à zéro les affichages et les clics de cette campagne ?" className="h-8 px-2" titre="Remettre les compteurs à zéro">
                            <RotateCcw className="size-4" />
                          </BoutonAction>
                          <BoutonAction action={supprimerPublicite.bind(null, p.id)} confirmation={`Supprimer définitivement la campagne « ${p.nom} » ?`} variante="danger" className="h-8 px-2" titre="Supprimer">
                            <Trash2 className="size-4" />
                          </BoutonAction>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Carte>

      <Carte titre={`Demandes d'annonceurs (${aTraiter} à traiter)`}>
        {demandes.length === 0 ? (
          <Vide>Aucune demande reçue. Elles arrivent depuis la page publique « Annonceurs ».</Vide>
        ) : (
          <ul className="divide-y divide-ligne">
            {demandes.map((d) => (
              <li key={d.id} className={cn("grid gap-3 py-4 md:grid-cols-[1fr_auto]", d.traitee && "opacity-60")}>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {d.organisation} <span className="font-normal text-texte-doux">— {d.nom}</span>
                    {!d.traitee && <span className="ml-2 bg-or px-1.5 text-[11px] font-bold text-noir">NOUVELLE</span>}
                  </p>
                  <p className="text-xs text-texte-doux">
                    {dateHeure(d.creeLe)} · {d.offre ? OFFRES[d.offre] ?? d.offre : "offre non précisée"} · {d.langue.toUpperCase()}
                    {d.telephone ? ` · ${d.telephone}` : ""}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm">{d.message}</p>
                </div>
                <div className="flex flex-wrap items-start gap-1">
                  <a href={`mailto:${d.email}?subject=${encodeURIComponent("Diwaa Mag — votre projet publicitaire")}`} className={cn(classesBouton.secondaire, "h-8 px-2")} title={`Répondre à ${d.email}`}>
                    <Mail className="size-4" aria-hidden /> Répondre
                  </a>
                  <BoutonAction action={marquerDemandeAnnonceur.bind(null, d.id, !d.traitee)} className="h-8 px-2">
                    {d.traitee ? "Rouvrir" : "Marquer traitée"}
                  </BoutonAction>
                  <BoutonAction action={supprimerDemandeAnnonceur.bind(null, d.id)} confirmation="Supprimer cette demande ?" variante="danger" className="h-8 px-2" titre="Supprimer">
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
