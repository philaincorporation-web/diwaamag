// Consultation du PDF source par un administrateur : lien Cloudinary signé valable 10 minutes
// (le fichier est privé), ou lecture locale en développement.
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { urlTelechargementPrive } from "@/lib/cloudinary";
import { cheminSourceLocale } from "@/lib/import-pdf/stockage";

export async function GET(_request: Request, { params }: RouteContext<"/api/admin/imports/[id]/pdf">) {
  const admin = await getAdmin();
  if (!admin) return new Response("Non autorisé", { status: 401 });
  const { id } = await params;
  const imp = await prisma.importPdf.findUnique({ where: { id }, select: { stockage: true, sourceId: true, sourceSupprimee: true } });
  if (!imp || !imp.sourceId) return new Response("Introuvable", { status: 404 });
  if (imp.sourceSupprimee) return new Response("Le PDF source a été supprimé (durée de conservation dépassée).", { status: 410 });
  const entetes = { "Content-Type": "application/pdf", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" };
  if (imp.stockage === "cloudinary") {
    // Transmis en flux (et non redirigé) : affichage dans la page, URL signée jamais exposée.
    const res = await fetch(urlTelechargementPrive(imp.sourceId, 120));
    if (!res.ok || !res.body) return new Response("Introuvable", { status: 404 });
    return new Response(res.body, { headers: entetes });
  }
  try {
    const octets = await readFile(cheminSourceLocale(imp.sourceId));
    return new Response(new Uint8Array(octets), { headers: entetes });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
