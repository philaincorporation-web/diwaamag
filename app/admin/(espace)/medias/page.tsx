import type { Metadata } from "next";
import Image from "next/image";
import { Copy, FileText, Trash2, Video } from "lucide-react";
import { prisma } from "@/lib/db";
import { dateCourte } from "@/lib/format";
import { supprimerMedia } from "@/lib/actions/gestion";
import { Carte, EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { EditionMedia } from "@/components/admin/formulaires";
import { TeleversementPage } from "@/components/admin/televersement-page";
import { exigerAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Médias" };

export default async function PageMedias() {
  await exigerAdmin(); // vérification d'accès (rend aussi la page dynamique)
  const medias = await prisma.media.findMany({ orderBy: { creeLe: "desc" }, include: { ajoutePar: { select: { nom: true } } } });
  return (
    <>
      <EnTeteAdmin titre="Médias" description="Bibliothèque partagée : images, vidéos et PDF. Le texte alternatif est obligatoire pour chaque image." />
      <Carte titre="Téléverser" className="mb-6">
        <TeleversementPage />
      </Carte>
      {medias.length === 0 ? (
        <Vide>La bibliothèque est vide. Les images des articles importés du DIWA MAG sont servies depuis /images/mag.</Vide>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {medias.map((m) => (
            <li key={m.id} className="border border-ligne bg-fond">
              <div className="relative aspect-[4/3] bg-fond-2">
                {m.type === "IMAGE" ? (
                  <Image src={m.url} alt={m.texteAlternatif} fill sizes="260px" className="object-cover" />
                ) : (
                  <a href={m.url} target="_blank" className="grid size-full place-items-center bg-noir text-or">
                    {m.type === "VIDEO" ? <Video className="size-10" aria-hidden /> : <FileText className="size-10" aria-hidden />}
                    <span className="sr-only">Ouvrir</span>
                  </a>
                )}
              </div>
              <div className="space-y-2 p-3">
                <EditionMedia id={m.id} alt={m.texteAlternatif} legende={m.legende} />
                <p className="text-[11px] text-texte-doux">{m.type} · {m.ajoutePar.nom} · {dateCourte(m.creeLe)}</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="flex min-w-0 items-center gap-1 truncate text-[11px] text-texte-doux"><Copy className="size-3 shrink-0" aria-hidden />{m.url}</code>
                  <BoutonAction action={supprimerMedia.bind(null, m.id)} variante="danger" className="h-7 px-2" titre="Supprimer" confirmation="Retirer ce média de la bibliothèque ?">
                    <Trash2 className="size-3.5" />
                  </BoutonAction>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
