import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import logoCouleur from "@/public/images/DIWA_MAG_LOGO_couleur.png";
import logoBlanc from "@/public/images/DIWA_MAG_LOGO_Blanc.png";

/**
 * Logo officiel DIWA MAG (image, slogan intégré).
 * - `clair` : fond toujours sombre → version blanche.
 * - sinon : version couleur en thème clair, blanche en thème sombre (variante `dark:` de globals.css).
 *   Une seule des deux images est affichée à la fois.
 */
export function Logo({
  clair = false,
  className,
  taille = "md",
  href = "/",
  slogan = "La femme digitale",
  prioritaire = false,
}: {
  clair?: boolean;
  className?: string;
  taille?: "sm" | "md" | "lg";
  href?: string;
  slogan?: string;
  prioritaire?: boolean;
}) {
  // Taille fluide : suit la largeur de l'écran sur mobile, plafonnée sur les grands écrans (ratio du logo ≈ 3,4:1).
  const hauteur = cn(
    taille === "sm" && "h-9 w-auto sm:h-10",
    taille === "md" && "h-auto w-[min(80vw,17rem)] sm:w-80 lg:w-96",
    taille === "lg" && "h-auto w-[min(88vw,24rem)] sm:w-[28rem] lg:w-[32rem]",
  );
  const sizes =
    taille === "sm" ? "140px" : taille === "md" ? "(min-width: 1024px) 384px, (min-width: 640px) 320px, 80vw" : "(min-width: 1024px) 512px, (min-width: 640px) 448px, 88vw";
  const alt = `DIWA MAG — ${slogan}`;
  return (
    <Link href={href} aria-label={alt} className={cn("inline-flex shrink-0 items-center leading-none", className)}>
      {clair ? (
        <Image src={logoBlanc} alt={alt} sizes={sizes} preload={prioritaire} className={hauteur} />
      ) : (
        <>
          <Image src={logoCouleur} alt={alt} sizes={sizes} preload={prioritaire} className={cn(hauteur, "block dark:hidden")} />
          <Image src={logoBlanc} alt="" aria-hidden sizes={sizes} preload={prioritaire} className={cn(hauteur, "hidden dark:block")} />
        </>
      )}
    </Link>
  );
}
