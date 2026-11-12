import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dateHeure, LIBELLES_TYPE } from "@/lib/format";
import type { TiptapDoc } from "@/lib/content";
import { TexteRiche } from "@/components/site/texte-riche";
import { BadgeStatut } from "@/components/admin/presentation";
import { exigerAdmin } from "@/lib/admin";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;

export const metadata: Metadata = { title: "Aperçu" };

/** Aperçu d'un article (y compris brouillon) tel qu'il apparaîtra sur le site — étape de relecture. */
export default async function Apercu({ params }: PageProps<"/admin/articles/[id]/apercu">) {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const { id } = await params;
  const a = await prisma.article.findUnique({ where: { id }, include: { rubrique: true, auteur: { select: { nom: true } } } });
  if (!a) notFound();
  return (
    <div className="bg-fond">
      <div className="flex items-center justify-between gap-4 border-b border-ligne bg-or/20 px-4 py-2 text-sm">
        <span className="flex items-center gap-2 font-semibold">Aperçu de relecture <BadgeStatut statut={a.statut} /></span>
        <Link href={`/admin/articles/${a.id}`} className="font-semibold underline">Revenir à l&apos;édition</Link>
      </div>
      <article className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-center font-titre text-xs uppercase tracking-[0.2em] text-or-fonce">{a.rubrique.nom} · {LIBELLES_TYPE[a.type]}</p>
        <h1 className="mt-4 text-center font-titre text-4xl font-bold uppercase leading-tight sm:text-5xl">{a.titre}</h1>
        <p className="mt-5 text-center font-serif text-xl text-texte-doux">{a.chapeau}</p>
        <p className="mt-4 text-center text-sm text-texte-doux">Par {a.auteur.nom} · {a.datePublication ? dateHeure(a.datePublication) : "non publié"}</p>
        {a.imageUneUrl && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-fond-2">
            <Image src={a.imageUneUrl} alt={a.imageUneAlt || a.titre} fill sizes="768px" className="object-cover object-top" />
          </div>
        )}
        <div className="mt-10">
          <TexteRiche doc={a.contenu as unknown as TiptapDoc} />
        </div>
      </article>
    </div>
  );
}
