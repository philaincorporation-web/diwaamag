import type { NextRequest } from "next/server";
import { getNumeros } from "@/lib/data";
import { estLangue } from "@/lib/i18n";

export async function GET(request: NextRequest) {
  const l = request.nextUrl.searchParams.get("lang");
  return Response.json({ numeros: await getNumeros(estLangue(l) ? l : "fr") });
}
