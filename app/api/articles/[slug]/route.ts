import type { NextRequest } from "next/server";
import { getArticle } from "@/lib/data";
import { estLangue } from "@/lib/i18n";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/articles/[slug]">) {
  const { slug } = await ctx.params;
  const l = request.nextUrl.searchParams.get("lang");
  const article = await getArticle(slug, estLangue(l) ? l : "fr");
  if (!article) return Response.json({ erreur: "Article introuvable" }, { status: 404 });
  return Response.json({ article });
}
