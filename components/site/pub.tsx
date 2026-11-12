// Emplacements publicitaires (composants serveur) : lisent les campagnes en cache et délèguent
// le choix de la bannière au navigateur. Sans campagne, rien n'est affiché (ou le contenu par défaut).
import { getPublicites, type EmplacementPublicite } from "@/lib/data";
import { BannierePub, MurSponsors } from "@/components/site/publicite";

export async function Pub({
  emplacement,
  format = "banniere",
  decalage,
  className,
  defaut = null,
}: {
  emplacement: Exclude<EmplacementPublicite, "SPONSORS" | "NEWSLETTER">;
  format?: "banniere" | "pave";
  decalage?: number;
  className?: string;
  defaut?: React.ReactNode;
}) {
  const pubs = (await getPublicites())[emplacement];
  if (!pubs.length) return defaut;
  return <BannierePub pubs={pubs} format={format} decalage={decalage} className={className} />;
}

export async function Sponsors() {
  const pubs = (await getPublicites()).SPONSORS;
  if (!pubs.length) return null;
  return <MurSponsors pubs={pubs} />;
}
