// API publique de contenu (réutilisable par une future application native — section 12).
// GET /api/articles?rubrique=gabon&page=1&limite=12&lang=en  |  GET /api/articles?q=ia
import type { NextRequest } from "next/server";
import { getArticlesRubrique, getDernieres, rechercher } from "@/lib/data";
import { estLangue } from "@/lib/i18n";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const lang = estLangue(p.get("lang")) ? (p.get("lang") as "fr" | "en") : "fr";
  const limite = Math.min(50, Math.max(1, Number(p.get("limite")) || 12));
  const page = Math.max(1, Number(p.get("page")) || 1);
  const rubrique = p.get("rubrique");
  const q = p.get("q");

  if (q) {
    const articles = await rechercher(q, lang, limite);
    return Response.json({ articles, total: articles.length });
  }
  if (rubrique) {
    const { articles, total, pages } = await getArticlesRubrique(rubrique, lang, page, limite);
    return Response.json({ articles, total, page, pages });
  }
  const articles = await getDernieres(lang, limite);
  return Response.json({ articles });
}
