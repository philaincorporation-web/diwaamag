// Squelette HTML commun aux deux racines (site public et back-office) : polices, styles et thème.
import { Antonio, Montserrat, Source_Serif_4 } from "next/font/google";
import { MotionConfig } from "@/components/ui/motion-config";
import "@/app/globals.css";

const antonio = Antonio({ variable: "--font-antonio", subsets: ["latin"], weight: ["500", "600", "700"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], style: ["normal", "italic"] });

// Exécuté avant l'affichage : applique le thème enregistré, sinon celui du système (pas de flash).
const scriptTheme = `(function(){try{var t=localStorage.getItem("diwa-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;

export function Racine({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html
      lang={lang}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${antonio.variable} ${montserrat.variable} ${sourceSerif.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <MotionConfig>{children}</MotionConfig>
      </body>
    </html>
  );
}
