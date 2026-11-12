import type { Metadata } from "next";
import { Power, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { exigerSuperAdmin } from "@/lib/admin";
import { dateHeure } from "@/lib/format";
import { basculerActivation, supprimerUtilisateur } from "@/lib/actions/gestion";
import { Carte, EnTeteAdmin } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { FormulaireUtilisateur, UtilisateurEditable } from "@/components/admin/formulaires";
import { cn } from "@/lib/cn";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function PageUtilisateurs() {
  const moi = await exigerSuperAdmin();
  const comptes = await prisma.admin.findMany({
    orderBy: [{ role: "asc" }, { nom: "asc" }],
    select: { id: true, nom: true, email: true, role: true, actif: true, bio: true, derniereConnexion: true, _count: { select: { articles: true } } },
  });
  return (
    <>
      <EnTeteAdmin titre="Utilisateurs" description="Tous les administrateurs disposent des mêmes droits de rédaction et de publication. Seul le super-administrateur gère les comptes, la suppression définitive et le journal." />
      <div className="space-y-3">
        {comptes.map((c) => (
          <div key={c.id} className={cn("flex flex-wrap items-center justify-between gap-3 border bg-fond p-4", c.actif ? "border-ligne" : "border-dashed border-ligne opacity-70")}>
            <div className="min-w-0">
              <p className="font-semibold">
                {c.nom} {c.id === moi.id && <span className="text-xs font-normal text-or-fonce">(vous)</span>}
              </p>
              <p className="text-sm text-texte-doux">{c.email}</p>
              <p className="mt-1 text-xs text-texte-doux">
                {c.role === "SUPER_ADMIN" ? "Super-administrateur" : "Administrateur"} · {c.actif ? "actif" : "désactivé"} · {c._count.articles} article(s) ·
                dernière connexion : {c.derniereConnexion ? dateHeure(c.derniereConnexion) : "jamais"}
              </p>
            </div>
            <UtilisateurEditable utilisateur={c}>
              {c.id !== moi.id && (
                <>
                  <BoutonAction action={basculerActivation.bind(null, c.id)} className="h-8 px-3" confirmation={c.actif ? `Désactiver le compte de ${c.nom} ?` : undefined}>
                    <Power className="size-4" aria-hidden /> {c.actif ? "Désactiver" : "Réactiver"}
                  </BoutonAction>
                  {c._count.articles === 0 && (
                    <BoutonAction action={supprimerUtilisateur.bind(null, c.id)} variante="danger" className="h-8 px-2" titre="Supprimer" confirmation={`Supprimer définitivement le compte de ${c.nom} ?`}>
                      <Trash2 className="size-4" />
                    </BoutonAction>
                  )}
                </>
              )}
            </UtilisateurEditable>
          </div>
        ))}
      </div>
      <Carte titre="Nouvel administrateur" className="mt-8">
        <FormulaireUtilisateur />
      </Carte>
    </>
  );
}
