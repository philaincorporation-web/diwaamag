import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin";
import { BarreAdmin } from "@/components/admin/barre-admin";

// Le back-office dépend de la session : il est rendu à la demande, derrière une limite <Suspense>.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-fond-2">
      <Suspense fallback={<Chargement />}>
        <Espace>{children}</Espace>
      </Suspense>
    </div>
  );
}

async function Espace({ children }: { children: React.ReactNode }) {
  const admin = await exigerAdmin();
  const enAttente = await prisma.commentaire.count({ where: { statut: { in: ["EN_ATTENTE", "SIGNALE"] } } });
  return (
    <>
      <BarreAdmin admin={{ nom: admin.nom, role: admin.role }} enAttente={enAttente} />
      <main className="px-4 py-8 lg:ml-64 lg:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}

function Chargement() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Loader2 className="size-8 animate-spin text-or" aria-label="Chargement" />
    </div>
  );
}
