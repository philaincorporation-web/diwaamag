import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { pageMessage } from "@/lib/page-message";

export async function GET(request: NextRequest) {
  const jeton = request.nextUrl.searchParams.get("jeton");
  const en = request.nextUrl.searchParams.get("langue") === "en";
  const accueil = en ? "/en" : "/fr";
  if (!jeton) return pageMessage(en ? "Invalid link" : "Lien invalide", en ? "This unsubscribe link is incomplete." : "Ce lien de désinscription est incomplet.", 400, accueil, en);
  const res = await prisma.abonneNewsletter.updateMany({ where: { jetonConfirmation: jeton }, data: { confirme: false, desinscritLe: new Date() } });
  if (res.count === 0) return pageMessage(en ? "Invalid link" : "Lien invalide", en ? "This unsubscribe link is not recognised." : "Ce lien de désinscription n'est pas reconnu.", 404, accueil, en);
  return pageMessage(
    en ? "Unsubscribed" : "Désinscription effectuée",
    en ? "You will no longer receive the newsletter. You can subscribe again at any time." : "Vous ne recevrez plus la newsletter. Vous pouvez vous réinscrire à tout moment.",
    200,
    accueil,
    en,
  );
}
