import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { supprimerMotCle } from "@/lib/actions/gestion";
import { EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { MotCleEditable } from "@/components/admin/formulaires";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Mots-clés" };

export default async function PageMotsCles() {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const mots = await prisma.motCle.findMany({ orderBy: { nom: "asc" }, include: { _count: { select: { articles: true } } } });
  return (
    <>
      <EnTeteAdmin titre="Mots-clés" description="Les mots-clés se créent depuis l'éditeur d'article. Cliquez sur un nom pour le renommer." />
      <div className="border border-ligne bg-fond">
        {mots.length === 0 ? (
          <Vide>Aucun mot-clé.</Vide>
        ) : (
          <ul className="divide-y divide-ligne">
            {mots.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <MotCleEditable id={m.id} nom={m.nom} />
                  <span className="text-xs text-texte-doux">/mot-cle/{m.slug} · {m._count.articles} article(s)</span>
                </div>
                <BoutonAction action={supprimerMotCle.bind(null, m.id)} variante="danger" className="h-8 px-2" titre="Supprimer" confirmation={`Supprimer le mot-clé « ${m.nom} » ? Il sera retiré des articles.`}>
                  <Trash2 className="size-4" />
                </BoutonAction>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
