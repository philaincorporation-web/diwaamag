// Bilan des campagnes publicitaires au format CSV (tableur), à transmettre aux annonceurs.
import { prisma } from "@/lib/db";
import { getAdmin, journaliser } from "@/lib/admin";
import { EMPLACEMENTS_PUB } from "@/lib/publicite-emplacements";

const cellule = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const jour = (d: Date | null) => (d ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Libreville" }).format(d) : "");

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return new Response("Non autorisé", { status: 401 });
  const pubs = await prisma.publicite.findMany({ orderBy: [{ annonceur: "asc" }, { creeLe: "asc" }] });
  const lignes = [
    ["annonceur", "campagne", "emplacement", "debut", "fin", "active", "affichages", "clics", "taux_de_clic_%"].join(";"),
    ...pubs.map((p) =>
      [
        p.annonceur,
        p.nom,
        EMPLACEMENTS_PUB[p.emplacement].libelle,
        jour(p.debut),
        jour(p.fin),
        p.actif ? "oui" : "non",
        p.affichages,
        p.clics,
        p.affichages ? ((p.clics / p.affichages) * 100).toFixed(2).replace(".", ",") : "",
      ]
        .map(cellule)
        .join(";"),
    ),
  ];
  await journaliser(admin.id, "EXPORT", "Publicite", null, { total: pubs.length });
  return new Response("\uFEFF" + lignes.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="bilan-publicites-diwaa-mag.csv"' },
  });
}
