"use server";
// Messages du formulaire de contact (back-office).

import { prisma } from "@/lib/db";
import { exigerAdmin, journaliser } from "@/lib/admin";
import type { Etat } from "@/lib/actions/gestion";

export async function marquerMessageLu(id: string, lu: boolean): Promise<Etat> {
  await exigerAdmin();
  await prisma.messageContact.update({ where: { id }, data: { lu } });
  return { ok: true, message: lu ? "Marqué comme lu." : "Marqué comme non lu." };
}

export async function supprimerMessage(id: string): Promise<Etat> {
  const admin = await exigerAdmin();
  const m = await prisma.messageContact.delete({ where: { id } });
  await journaliser(admin.id, "SUPPRESSION", "MessageContact", id, { de: m.email, sujet: m.sujet });
  return { ok: true, message: "Message supprimé." };
}
