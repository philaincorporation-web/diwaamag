import type { NextRequest } from "next/server";
import { getRubriques } from "@/lib/data";
import { estLangue } from "@/lib/i18n";

export async function GET(request: NextRequest) {
  const l = request.nextUrl.searchParams.get("lang");
  return Response.json({ rubriques: await getRubriques(estLangue(l) ? l : "fr") });
}
