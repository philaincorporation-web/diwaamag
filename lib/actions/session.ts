"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getAdmin, journaliser } from "@/lib/admin";

export async function connexion(_: { erreur?: string } | null, formData: FormData) {
  const retour = String(formData.get("retour") || "/admin");
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: retour.startsWith("/admin") ? retour : "/admin",
    });
    return null;
  } catch (e) {
    if (e instanceof AuthError) return { erreur: "Adresse e-mail ou mot de passe incorrect, ou compte désactivé." };
    throw e; // redirection de succès
  }
}

export async function deconnexion() {
  const admin = await getAdmin();
  if (admin) await journaliser(admin.id, "DECONNEXION", "Session");
  await signOut({ redirectTo: "/admin/connexion" });
}
