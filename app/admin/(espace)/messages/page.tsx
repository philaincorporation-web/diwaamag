import type { Metadata } from "next";
import { Mail, MailCheck, MailWarning, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin";
import { dateHeure } from "@/lib/format";
import { cn } from "@/lib/cn";
import { marquerMessageLu, supprimerMessage } from "@/lib/actions/messages";
import { Carte, EnTeteAdmin, Vide } from "@/components/admin/presentation";
import { BoutonAction } from "@/components/admin/ui";
import { classesBouton } from "@/components/admin/styles";

// Page liée à la session : rendue à la demande (navigation bloquante assumée).
export const instant = false;
export const metadata: Metadata = { title: "Messages" };

export default async function PageMessages() {
  await exigerAdmin();
  const messages = await prisma.messageContact.findMany({ orderBy: [{ lu: "asc" }, { creeLe: "desc" }], take: 200 });
  const nonLus = messages.filter((m) => !m.lu).length;
  const sansEmail = messages.filter((m) => !m.emailEnvoye).length;
  return (
    <>
      <EnTeteAdmin
        titre="Messages"
        description="Messages envoyés depuis le formulaire de contact du site. Ils sont toujours enregistrés ici, même si l'e-mail de notification n'a pas pu partir."
      />
      {sansEmail > 0 && (
        <p className="mb-6 flex gap-2 border-l-4 border-or bg-or-clair/40 px-4 py-3 text-sm">
          <MailWarning className="mt-0.5 size-4 shrink-0 text-or-fonce" aria-hidden />
          {sansEmail} message(s) n&apos;ont pas pu être transmis par e-mail : vérifiez la configuration de Resend (RESEND_API_KEY, domaine d&apos;envoi vérifié et EMAIL_FROM).
        </p>
      )}
      <Carte titre={`Messages reçus (${nonLus} non lu${nonLus > 1 ? "s" : ""})`}>
        {messages.length === 0 ? (
          <Vide>Aucun message pour l&apos;instant.</Vide>
        ) : (
          <ul className="divide-y divide-ligne">
            {messages.map((m) => (
              <li key={m.id} className={cn("grid gap-3 py-4 md:grid-cols-[1fr_auto]", m.lu && "opacity-60")}>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {m.sujet}
                    {!m.lu && <span className="ml-2 bg-or px-1.5 text-[11px] font-bold text-noir">NOUVEAU</span>}
                  </p>
                  <p className="text-xs text-texte-doux">
                    {m.nom} · {m.email} · {dateHeure(m.creeLe)} · {m.langue.toUpperCase()}
                    {m.emailEnvoye ? (
                      <span className="ml-1 inline-flex items-center gap-1 text-succes">
                        <MailCheck className="size-3" aria-hidden /> transmis par e-mail
                      </span>
                    ) : (
                      <span className="ml-1 text-or-fonce">· non transmis par e-mail</span>
                    )}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
                </div>
                <div className="flex flex-wrap items-start gap-1">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.sujet}`)}`} className={cn(classesBouton.secondaire, "h-8 px-2")}>
                    <Mail className="size-4" aria-hidden /> Répondre
                  </a>
                  <BoutonAction action={marquerMessageLu.bind(null, m.id, !m.lu)} className="h-8 px-2">
                    {m.lu ? "Non lu" : "Marquer lu"}
                  </BoutonAction>
                  <BoutonAction action={supprimerMessage.bind(null, m.id)} confirmation="Supprimer ce message ?" variante="danger" className="h-8 px-2" titre="Supprimer">
                    <Trash2 className="size-4" />
                  </BoutonAction>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </>
  );
}
