import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { pageMessage } from "@/lib/page-message";

export async function GET(request: NextRequest) {
  const jeton = request.nextUrl.searchParams.get("jeton");
  const en = request.nextUrl.searchParams.get("langue") === "en";
  const accueil = en ? "/en" : "/fr";
  if (!jeton) return pageMessage(en ? "Invalid link" : "Lien invalide", en ? "This confirmation link is incomplete." : "Ce lien de confirmation est incomplet.", 400, accueil, en);
  const abonne = await prisma.abonneNewsletter.findUnique({ where: { jetonConfirmation: jeton } });
  if (!abonne) {
    return pageMessage(en ? "Link expired" : "Lien expiré", en ? "This link has already been used or is no longer valid." : "Ce lien a déjà été utilisé ou n'est plus valide.", 404, accueil, en);
  }
  // Le jeton est conservé : il sert ensuite de clé de désinscription.
  await prisma.abonneNewsletter.update({ where: { id: abonne.id }, data: { confirme: true, desinscritLe: null } });
  return pageMessage(
    en ? "Subscription confirmed" : "Inscription confirmée",
    en ? "Thank you! You will now receive the DIWA MAG newsletter." : "Merci ! Vous recevrez désormais la newsletter du DIWA MAG.",
    200,
    accueil,
    en,
  );
}
