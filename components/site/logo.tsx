import Link from "next/link";
import { cn } from "@/lib/cn";

/** Logotype DIWA MAG (typographique, aux couleurs de la charte). */
export function Logo({
  clair = false,
  className,
  taille = "md",
  href = "/",
  slogan = "La femme digitale",
}: {
  clair?: boolean;
  className?: string;
  taille?: "sm" | "md" | "lg";
  href?: string;
  slogan?: string;
}) {
  return (
    <Link href={href} aria-label="DIWA MAG" className={cn("group inline-flex items-end gap-2 leading-none", className)}>
      <span
        className={cn(
          "font-titre font-bold uppercase tracking-tight",
          taille === "sm" && "text-3xl",
          taille === "md" && "text-4xl sm:text-5xl",
          taille === "lg" && "text-6xl sm:text-7xl",
          clair ? "text-white" : "text-encre",
        )}
      >
        DIW<span className="text-or">A</span>
      </span>
      <span className="mb-1 flex flex-col">
        <span className="bg-or px-1.5 py-0.5 font-titre text-[13px] font-bold uppercase tracking-[0.2em] text-noir">Mag</span>
        <span
          className={cn(
            "mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.16em] sm:block",
            clair ? "text-white/70" : "text-texte-doux",
          )}
        >
          {slogan}
        </span>
      </span>
    </Link>
  );
}
