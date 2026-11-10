import type { Metadata, Viewport } from "next";
import { Racine } from "@/components/racine";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s — Back-office DIWA MAG" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#111111" };

/** Racine du back-office (interface en français). */
export default function RacineAdmin({ children }: LayoutProps<"/admin">) {
  return <Racine lang="fr">{children}</Racine>;
}
