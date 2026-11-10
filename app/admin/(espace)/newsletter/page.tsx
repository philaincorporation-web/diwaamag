import type { Metadata } from "next";
import { Download, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { dateCourte } from "@/lib/format";
import { supprimerAbonne } from "@/lib/actions/gestion";
import { Carte, EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { classesBouton } from "@/components/admin/styles";
import { FormulaireEnvoiNewsletter } from "@/components/admin/formulaires";
import { exigerAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Newsletter" };

export default async function PageNewsletter() {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const [abonnes, numeros] = await Promise.all([
    prisma.abonneNewsletter.findMany({ orderBy: { creeLe: "desc" }, take: 300 }),
    prisma.numero.findMany({ where: { publie: true }, orderBy: { mois: "desc" }, select: { id: true, titre: true } }),
  ]);
  const confirmes = abonnes.filter((a) => a.confirme && !a.desinscritLe).length;
  return (
    <>
      <EnTeteAdmin
        titre="Newsletter"
        description={`${confirmes} abonné(s) confirmé(s) · ${abonnes.length} inscription(s) au total.`}
        actions={
          <a href="/api/admin/abonnes.csv" className={classesBouton.secondaire}>
            <Download className="size-4" aria-hidden /> Exporter (CSV)
          </a>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Carte titre="Envoyer une newsletter">
          {process.env.RESEND_API_KEY ? (
            <FormulaireEnvoiNewsletter numeros={numeros} abonnes={confirmes} />
          ) : (
            <p className="text-sm text-texte-doux">
              Configurez <code>RESEND_API_KEY</code> et <code>EMAIL_FROM</code> (domaine vérifié avec SPF, DKIM et DMARC) pour activer l&apos;envoi.
            </p>
          )}
        </Carte>
        <Carte titre="Abonnés">
          {abonnes.length === 0 ? (
            <Vide>Aucune inscription pour le moment.</Vide>
          ) : (
            <ul className="max-h-[520px] divide-y divide-ligne overflow-y-auto text-sm">
              {abonnes.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.email}</p>
                    <p className="text-xs text-texte-doux">
                      {dateCourte(a.creeLe)} · {a.desinscritLe ? "désinscrit" : a.confirme ? "confirmé" : "en attente de confirmation"}
                    </p>
                  </div>
                  <BoutonAction action={supprimerAbonne.bind(null, a.id)} variante="danger" className="h-7 px-2" titre="Supprimer" confirmation={`Supprimer ${a.email} ?`}>
                    <Trash2 className="size-3.5" />
                  </BoutonAction>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>
    </>
  );
}
