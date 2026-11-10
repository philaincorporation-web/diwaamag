import { EnTetePage } from "@/components/site/liste";

/** Gabarit des pages institutionnelles (À propos, mentions légales…). */
export function PageTexte({ surtitre, titre, children }: { surtitre?: string; titre: string; children: React.ReactNode }) {
  return (
    <>
      <EnTetePage surtitre={surtitre} titre={titre} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="corps-article sans-lettrine">{children}</div>
      </div>
    </>
  );
}
