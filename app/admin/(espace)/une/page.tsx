import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { EnTeteAdmin } from "@/components/admin/presentation";
import { OrdreUne } from "@/components/admin/formulaires";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "La Une" };

export default async function PageUne() {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const articles = await prisma.article.findMany({
    where: { statut: "PUBLIE" },
    orderBy: [{ aLaUne: "desc" }, { ordreUne: "asc" }, { datePublication: "desc" }],
    select: { id: true, titre: true, imageUneUrl: true, aLaUne: true, rubrique: { select: { nom: true } } },
  });
  const map = (a: (typeof articles)[number]) => ({ id: a.id, titre: a.titre, imageUneUrl: a.imageUneUrl, rubrique: a.rubrique.nom });
  return (
    <>
      <EnTeteAdmin titre="La Une" description="Choisissez et ordonnez les articles du carrousel d'accueil (8 au maximum). Glissez-déposez ou utilisez les flèches." />
      <OrdreUne initiaux={articles.filter((a) => a.aLaUne).map(map)} disponibles={articles.map(map)} />
    </>
  );
}
