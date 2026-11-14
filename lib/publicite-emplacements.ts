// Emplacements publicitaires du back-office : libellés, codes du cahier des charges et formats standards
// (module neutre, serveur et client). Les dimensions sont celles des fichiers à fournir (@2x).
// La position et les formats d'affichage sur le site sont dans config/ads.config.ts.
export const EMPLACEMENTS_PUB = {
  HAUT_PAGE: {
    libelle: "HP-01 · Billboard haut de page (toutes les pages)",
    format: "ordinateur 1940 × 500 px (affiché 970 × 250) + mobile 640 × 200 px (affiché 320 × 100)",
    mobile: true,
  },
  ACCUEIL: {
    libelle: "HP-05 · Bannière de l'accueil, entre les sections",
    format: "ordinateur 1456 × 180 px (affiché 728 × 90) + mobile 640 × 200 px (affiché 320 × 100)",
    mobile: true,
  },
  BARRE_LATERALE: { libelle: "HP-02 · Rectangle de la barre latérale", format: "600 × 500 px (affiché 300 × 250)", mobile: false },
  ARTICLE_HAUT: {
    libelle: "ART-01 · Article, avant le texte",
    format: "ordinateur 1456 × 180 px (affiché 728 × 90) + mobile 640 × 200 px (affiché 320 × 100)",
    mobile: true,
  },
  ARTICLE_MILIEU: { libelle: "ART-02 · Article, rectangle dans le texte", format: "600 × 500 px (affiché 300 × 250)", mobile: false },
  ARTICLE_BAS: {
    libelle: "ART-04 · Article, bandeau de fin",
    format: "ordinateur 1456 × 180 px (affiché 728 × 90) + mobile 640 × 200 px (affiché 320 × 100)",
    mobile: true,
  },
  SPONSORS: { libelle: "HP-10 · Mur des partenaires (logo)", format: "logo PNG transparent, 400 × 160 px", mobile: false },
  NEWSLETTER: { libelle: "Newsletter (en tête de la lettre)", format: "1200 × 300 px (affiché 600 × 150)", mobile: false },
} as const;
export type CleEmplacement = keyof typeof EMPLACEMENTS_PUB;

export const LANGUES_PUB = {
  TOUTES: "Français et anglais",
  FR: "Version française uniquement (/fr)",
  EN: "Version anglaise uniquement (/en)",
} as const;
export type CleLanguePub = keyof typeof LANGUES_PUB;
