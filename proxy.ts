// 1. Langues du site public : toutes les pages vivent sous /fr/… ou /en/…. Une adresse sans préfixe
//    (/, /article/x…) est redirigée vers la langue préférée du navigateur (français par défaut).
// 2. Première barrière du back-office : redirige vers la connexion si aucun cookie de session n'est présent.
//    La vérification complète (signature du jeton, compte actif, rôle) est faite côté serveur dans lib/admin.ts.
import { NextResponse, type NextRequest } from "next/server";
import { languePreferee } from "@/lib/i18n";

const COOKIES_SESSION = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/connexion")) return NextResponse.next();
    if (!COOKIES_SESSION.some((c) => request.cookies.has(c))) {
      const url = new URL("/admin/connexion", request.url);
      url.searchParams.set("retour", pathname);
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  if (/^\/(fr|en)(\/|$)/.test(pathname)) return NextResponse.next();

  const lang = languePreferee(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  // 307 pour l'accueil (dépend du navigateur), 308 pour les anciennes adresses d'articles.
  return NextResponse.redirect(url, pathname === "/" ? 307 : 308);
}

export const config = {
  // Tout sauf l'API, les ressources Next, les fichiers statiques (avec extension) et les routes techniques.
  matcher: ["/((?!api|_next|newsletter|.*\\..*).*)"],
};
