import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DIWAA Magazine",
    short_name: "DIWA Mag",
    description: "Le magazine des DigieWomen Awards Africa : l'actualité du numérique au Gabon, en Afrique et dans le monde.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#111111",
    theme_color: "#111111",
    lang: "fr",
    dir: "ltr",
    categories: ["news", "magazines"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dernières actualités", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Anciens numéros", url: "/numeros", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
