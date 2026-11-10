// Export CSV des abonnés confirmés à la newsletter (administrateurs uniquement).
import { prisma } from "@/lib/db";
import { getAdmin, journaliser } from "@/lib/admin";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return new Response("Non autorisé", { status: 401 });
  const abonnes = await prisma.abonneNewsletter.findMany({ where: { confirme: true, desinscritLe: null }, orderBy: { creeLe: "asc" } });
  const lignes = ["email;inscrit_le", ...abonnes.map((a) => `${a.email};${a.creeLe.toISOString()}`)];
  await journaliser(admin.id, "EXPORT", "AbonneNewsletter", null, { total: abonnes.length });
  return new Response("﻿" + lignes.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="abonnes-diwa-mag.csv"' },
  });
}
