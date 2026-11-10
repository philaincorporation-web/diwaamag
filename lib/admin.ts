// Contrôles d'accès et journal d'activité du back-office.
// Chaque Server Action et chaque route d'API d'administration revérifie la session ici :
// la protection de /admin par le proxy n'est qu'une première barrière.
import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export type AdminCourant = { id: string; nom: string; email: string; role: "SUPER_ADMIN" | "ADMIN" };

/** Retourne l'administrateur connecté et actif, ou null. */
export async function getAdmin(): Promise<AdminCourant | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  // Revalide en base : un compte désactivé perd l'accès immédiatement.
  const admin = await prisma.admin.findUnique({
    where: { id: session.user.id },
    select: { id: true, nom: true, email: true, role: true, actif: true },
  });
  if (!admin || !admin.actif) return null;
  return { id: admin.id, nom: admin.nom, email: admin.email, role: admin.role };
}

export async function exigerAdmin(): Promise<AdminCourant> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/connexion");
  return admin;
}

export async function exigerSuperAdmin(): Promise<AdminCourant> {
  const admin = await exigerAdmin();
  if (admin.role !== "SUPER_ADMIN") redirect("/admin?erreur=droits");
  return admin;
}

export async function journaliser(
  adminId: string,
  action: string,
  cible: string,
  cibleId?: string | null,
  details?: Prisma.InputJsonValue,
) {
  await prisma.journalActivite.create({
    data: { adminId, action, cible, cibleId: cibleId ?? null, details },
  });
}
