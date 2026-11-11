// Squelette HTML commun aux deux racines (site public et back-office) : polices, styles et thème.
import { Antonio, Montserrat, Source_Serif_4 } from "next/font/google";
import { MotionConfig } from "@/components/ui/motion-config";
import { ScriptTheme } from "@/components/script-theme";
import "@/app/globals.css";

const antonio = Antonio({ variable: "--font-antonio", subsets: ["latin"], weight: ["500", "600", "700"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], style: ["normal", "italic"] });

export function Racine({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html
      lang={lang}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${antonio.variable} ${montserrat.variable} ${sourceSerif.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <ScriptTheme />
        <MotionConfig>{children}</MotionConfig>
      </body>
    </html>
  );
}
