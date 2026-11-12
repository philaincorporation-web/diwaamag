import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigerSuperAdmin } from "@/lib/admin";
import { dateHeure } from "@/lib/format";
import { EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { classesBouton } from "@/components/admin/styles";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Journal d'activité" };

const PAR_PAGE = 50;

export default async function PageJournal({ searchParams }: PageProps<"/admin/journal">) {
  await exigerSuperAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const adminId = typeof sp.admin === "string" ? sp.admin : undefined;
  const [entrees, total, admins] = await Promise.all([
    prisma.journalActivite.findMany({
      where: { adminId },
      orderBy: { creeLe: "desc" },
      take: PAR_PAGE,
      skip: (page - 1) * PAR_PAGE,
      include: { admin: { select: { nom: true } } },
    }),
    prisma.journalActivite.count({ where: { adminId } }),
    prisma.admin.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const lien = (p: number) => `/admin/journal?page=${p}${adminId ? `&admin=${adminId}` : ""}`;
  return (
    <>
      <EnTeteAdmin titre="Journal d'activité" description={`${total} action(s) tracée(s).`} />
      <form className="mb-4 flex gap-2" action="/admin/journal">
        <select name="admin" defaultValue={adminId ?? ""} className="h-10 border border-ligne bg-fond px-3 text-sm" aria-label="Filtrer par administrateur">
          <option value="">Tous les administrateurs</option>
          {admins.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
        </select>
        <button className={classesBouton.secondaire}>Filtrer</button>
      </form>
      <div className="overflow-x-auto border border-ligne bg-fond">
        {entrees.length === 0 ? (
          <Vide>Aucune activité.</Vide>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-ligne bg-fond-2 text-left text-xs uppercase tracking-wide text-texte-doux">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Administrateur</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Cible</th>
                <th className="px-4 py-2">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ligne">
              {entrees.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-texte-doux">{dateHeure(e.creeLe)}</td>
                  <td className="px-4 py-2">{e.admin.nom}</td>
                  <td className="px-4 py-2 font-mono text-xs font-semibold">{e.action}</td>
                  <td className="px-4 py-2">
                    {e.cible === "Article" && e.cibleId ? <Link href={`/admin/articles/${e.cibleId}`} className="hover:text-or-fonce">Article</Link> : e.cible}
                  </td>
                  <td className="max-w-xs truncate px-4 py-2 font-mono text-xs text-texte-doux">{e.details ? JSON.stringify(e.details) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {page > 1 && <Link href={lien(page - 1)} className={classesBouton.secondaire}>← Précédent</Link>}
          <span className="self-center">Page {page} / {pages}</span>
          {page < pages && <Link href={lien(page + 1)} className={classesBouton.secondaire}>Suivant →</Link>}
        </div>
      )}
    </>
  );
}
