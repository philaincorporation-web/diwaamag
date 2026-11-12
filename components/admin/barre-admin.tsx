"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Newspaper,
  ScrollText,
  Star,
  Tags,
  Users,
  X,
  ExternalLink,
  KeyRound,
  FileUp,
  Megaphone,
} from "lucide-react";
import { deconnexion } from "@/lib/actions/session";
import { cn } from "@/lib/cn";

const LIENS = [
  { href: "/admin", libelle: "Tableau de bord", icone: LayoutDashboard },
  { href: "/admin/articles", libelle: "Articles", icone: FileText },
  { href: "/admin/imports", libelle: "Import PDF", icone: FileUp },
  { href: "/admin/une", libelle: "La Une", icone: Star },
  { href: "/admin/medias", libelle: "Médias", icone: ImageIcon },
  { href: "/admin/publicites", libelle: "Publicités", icone: Megaphone },
  { href: "/admin/rubriques", libelle: "Rubriques", icone: FolderTree },
  { href: "/admin/mots-cles", libelle: "Mots-clés", icone: Tags },
  { href: "/admin/commentaires", libelle: "Commentaires", icone: MessageSquare, compteur: "commentaires" as const },
  { href: "/admin/numeros", libelle: "Numéros", icone: Newspaper },
  { href: "/admin/newsletter", libelle: "Newsletter", icone: Mail },
];
const LIENS_SUPER = [
  { href: "/admin/utilisateurs", libelle: "Utilisateurs", icone: Users },
  { href: "/admin/journal", libelle: "Journal d'activité", icone: ScrollText },
];

export function BarreAdmin({ admin, enAttente }: { admin: { nom: string; role: string }; enAttente: number }) {
  const chemin = usePathname();
  const [ouvertSur, setOuvertSur] = useState<string | null>(null);
  const ouvert = ouvertSur === chemin; // se referme au changement de page
  const setOuvert = (v: boolean) => setOuvertSur(v ? chemin : null);
  const actif = (href: string) => (href === "/admin" ? chemin === "/admin" : chemin.startsWith(href));
  const liens = admin.role === "SUPER_ADMIN" ? [...LIENS, ...LIENS_SUPER] : LIENS;

  const contenu = (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <Link href="/admin" className="font-titre text-3xl font-bold uppercase leading-none">
          DIW<span className="text-or">A</span> <span className="bg-or px-1 text-base text-noir">ADMIN</span>
        </Link>
        <button type="button" onClick={() => setOuvert(false)} className="lg:hidden" aria-label="Fermer le menu">
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Back-office">
        <ul className="space-y-0.5">
          {liens.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={actif(l.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                  actif(l.href) ? "bg-or text-noir" : "text-white/75 hover:bg-white/5 hover:text-white",
                )}
              >
                <l.icone className="size-4" aria-hidden />
                <span className="flex-1">{l.libelle}</span>
                {"compteur" in l && enAttente > 0 && (
                  <span className={cn("rounded-full px-2 text-[11px] font-bold", actif(l.href) ? "bg-noir text-or" : "bg-or text-noir")}>{enAttente}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3 text-sm">
        <a href="/fr" target="_blank" className="flex items-center gap-3 px-3 py-2 text-white/70 hover:text-white">
          <ExternalLink className="size-4" aria-hidden /> Voir le site
        </a>
        <Link href="/admin/compte" className="flex items-center gap-3 px-3 py-2 text-white/70 hover:text-white">
          <KeyRound className="size-4" aria-hidden /> Mon compte
        </Link>
        <form action={deconnexion}>
          <button className="flex w-full items-center gap-3 px-3 py-2 text-white/70 hover:text-white">
            <LogOut className="size-4" aria-hidden /> Déconnexion
          </button>
        </form>
        <p className="px-3 pt-2 text-xs text-white/40">
          {admin.nom} · {admin.role === "SUPER_ADMIN" ? "Super-administrateur" : "Administrateur"}
        </p>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-noir px-4 text-white lg:hidden">
        <button type="button" onClick={() => setOuvert(true)} aria-label="Ouvrir le menu" aria-expanded={ouvert}>
          <Menu className="size-6" />
        </button>
        <span className="font-titre text-xl uppercase">DIW<span className="text-or">A</span> Admin</span>
        <span className="w-6" />
      </div>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-noir text-white lg:flex">{contenu}</aside>
      {ouvert && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setOuvert(false)} aria-label="Fermer le menu" />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-noir text-white">{contenu}</aside>
        </div>
      )}
    </>
  );
}
