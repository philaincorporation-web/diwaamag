// Emplacements publicitaires : libellés et formats conseillés (module neutre, serveur et client).
export const EMPLACEMENTS_PUB = {
  HAUT_PAGE: { libelle: "Haut de page (toutes les pages)", format: "1600 × 200 px" },
  ACCUEIL: { libelle: "Accueil, entre les sections", format: "1600 × 200 px" },
  ARTICLE_HAUT: { libelle: "Article, avant le texte", format: "1600 × 200 px" },
  ARTICLE_BAS: { libelle: "Article, après le texte", format: "1600 × 200 px" },
  BARRE_LATERALE: { libelle: "Barre latérale", format: "600 × 600 ou 600 × 900 px" },
  SPONSORS: { libelle: "Mur des partenaires (logo)", format: "logo PNG transparent, 400 × 160 px" },
  NEWSLETTER: { libelle: "Newsletter (en tête)", format: "1200 × 300 px" },
} as const;
export type CleEmplacement = keyof typeof EMPLACEMENTS_PUB;
