import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { donneesEditeur } from "@/lib/admin-donnees";
import { moisAnnee } from "@/lib/format";
import { supprimerNumero } from "@/lib/actions/gestion";
import { Carte, EnTeteAdmin } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { classesBouton } from "@/components/admin/styles";
import { FormulaireNumero, NumeroEditable } from "@/components/admin/formulaires";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Numéros mensuels" };

export default async function PageNumeros() {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const [numeros, articles, { medias }] = await Promise.all([
    prisma.numero.findMany({ orderBy: { mois: "desc" }, include: { articles: { orderBy: { ordre: "asc" }, select: { articleId: true } } } }),
    prisma.article.findMany({
      where: { statut: { in: ["PUBLIE", "PROGRAMME", "BROUILLON"] } },
      orderBy: { datePublication: "desc" },
      select: { id: true, titre: true, rubrique: { select: { nom: true } } },
    }),
    donneesEditeur(),
  ]);
  const choix = articles.map((a) => ({ id: a.id, titre: a.titre, rubrique: a.rubrique.nom }));
  return (
    <>
      <EnTeteAdmin titre="Numéros mensuels" description="Sélection d'articles, couverture et version PDF téléchargeable." />
      <div className="space-y-4">
        {numeros.map((n) => (
          <NumeroEditable
            key={n.id}
            articles={choix}
            medias={medias}
            numero={{
              id: n.id,
              titre: n.titre,
              titreEn: n.titreEn,
              editoEn: n.editoEn,
              mois: n.mois.toISOString().slice(0, 7),
              couvertureUrl: n.couvertureUrl,
              pdfUrl: n.pdfUrl,
              edito: n.edito,
              publie: n.publie,
              articleIds: n.articles.map((a) => a.articleId),
            }}
          >
            <div className="flex gap-5 border border-ligne bg-fond p-5">
              <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden bg-fond-2">
                <Image src={n.couvertureUrl} alt={`Couverture — ${n.titre}`} fill sizes="96px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1 pr-12">
                <p className="font-titre text-xs uppercase tracking-[0.16em] text-or-fonce">{moisAnnee(n.mois)} · {n.publie ? "Publié" : "Non publié"}</p>
                <p className="mt-1 text-lg font-semibold">{n.titre}</p>
                <p className="mt-1 text-sm text-texte-doux">{n.articles.length} article(s) · {n.pdfUrl ? "PDF disponible" : "Pas de PDF"}</p>
                <div className="mt-3 flex gap-2">
                  {n.publie && (
                    <a href={`/fr/numeros/${n.slug}`} target="_blank" className={`${classesBouton.secondaire} h-8 px-3`}>
                      <ExternalLink className="size-4" aria-hidden /> Voir
                    </a>
                  )}
                  <BoutonAction action={supprimerNumero.bind(null, n.id)} variante="danger" className="h-8 px-3" confirmation={`Supprimer « ${n.titre} » ? Les articles ne sont pas supprimés.`}>
                    <Trash2 className="size-4" aria-hidden /> Supprimer
                  </BoutonAction>
                </div>
              </div>
            </div>
          </NumeroEditable>
        ))}
      </div>
      <Carte titre="Nouveau numéro" className="mt-8">
        <FormulaireNumero articles={choix} medias={medias} />
      </Carte>
    </>
  );
}
