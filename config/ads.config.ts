// Configuration centralisée des encarts publicitaires (cahier des charges « encarts publicitaires », §5 et §7.2).
// Un emplacement = un code (HP-xx, ART-xx, RUB-xx), un emplacement en base (EmplacementPub), des formats
// par appareil (absent = non rendu sur cet appareil) et une phase de déploiement.
// Points de rupture : ceux du site (Tailwind md = 768 px, lg = 1024 px), identiques au cahier.

export const breakpoints = { tablet: 768, desktop: 1024 } as const;

export type Appareil = "desktop" | "tablet" | "mobile";
export type FormatPub = { w: number; h: number; fluid?: boolean };
export type TypeEmplacement = "carousel" | "banner" | "rectangle" | "halfpage" | "logos" | "sponsor";
export type EmplacementBase = "HAUT_PAGE" | "ACCUEIL" | "ARTICLE_HAUT" | "ARTICLE_MILIEU" | "ARTICLE_BAS" | "BARRE_LATERALE" | "SPONSORS" | "NEWSLETTER";

/** Campagne interne affichée quand l'emplacement n'est pas vendu (jamais de cadre vide). */
export type CampagneMaison = "digiewomen-awards" | "devenir-partenaire" | "newsletter" | "whatsapp";

export type ConfigEmplacement = {
  libelle: string;
  page: "toutes" | "accueil" | "article" | "rubrique";
  type: TypeEmplacement;
  /** Emplacement en base ; null = pas encore créé (phase 2 ou 3). */
  emplacement: EmplacementBase | null;
  formats: Partial<Record<Appareil, FormatPub>>;
  phase: 1 | 2 | 3;
  interval?: number;
  maxItems?: number;
  houseAd?: CampagneMaison;
  /** Campagnes internes de repli, tirées au hasard. */
  maisons?: CampagneMaison[];
  mobileOrder?: string;
};

const BANNIERE: ConfigEmplacement["formats"] = {
  desktop: { w: 728, h: 90 }, // 970 × 90 accepté ; fichier source 1456 × 180
  tablet: { w: 728, h: 90 },
  mobile: { w: 320, h: 100, fluid: true }, // fichier source 640 × 200
};
const RECTANGLE: ConfigEmplacement["formats"] = {
  desktop: { w: 300, h: 250 },
  tablet: { w: 300, h: 250 },
  mobile: { w: 300, h: 250, fluid: true },
};

export const adSlots = {
  // ── Page d'accueil ───────────────────────────────────────────────────────────────────────
  "HP-01": {
    libelle: "Billboard premium (sous la navigation, toutes les pages)",
    page: "toutes",
    type: "carousel",
    emplacement: "HAUT_PAGE",
    interval: 7000,
    maxItems: 3,
    formats: { desktop: { w: 970, h: 250 }, tablet: { w: 728, h: 180 }, mobile: { w: 320, h: 100, fluid: true } },
    houseAd: "digiewomen-awards",
    phase: 1,
  },
  "HP-02": {
    libelle: "Rectangle latéral",
    page: "accueil",
    type: "rectangle",
    emplacement: "BARRE_LATERALE",
    formats: RECTANGLE,
    // La newsletter et WhatsApp ont déjà leur bloc juste en dessous dans la colonne latérale.
    maisons: ["devenir-partenaire"],
    mobileOrder: "after-latest-3",
    phase: 1,
  },
  "HP-03": { libelle: "Météo sponsorisée", page: "accueil", type: "sponsor", emplacement: null, formats: { desktop: { w: 120, h: 40 }, tablet: { w: 120, h: 40 }, mobile: { w: 100, h: 34 } }, phase: 2 },
  "HP-04": { libelle: "Half-page latéral", page: "accueil", type: "halfpage", emplacement: null, formats: { desktop: { w: 300, h: 600 } }, phase: 2 },
  "HP-05": {
    libelle: "Bannière inter-sections 1",
    page: "accueil",
    type: "banner",
    emplacement: "ACCUEIL",
    formats: BANNIERE,
    maisons: ["newsletter"],
    phase: 1,
  },
  "HP-06": { libelle: "Sponsor de rubrique (accueil)", page: "accueil", type: "sponsor", emplacement: null, formats: { desktop: { w: 120, h: 40 }, tablet: { w: 120, h: 40 }, mobile: { w: 100, h: 34 } }, phase: 2 },
  // Bannière d'accueil existante (2e emplacement ACCUEIL) : conservée sur ordinateur et tablette en attendant
  // son déplacement entre « Femmes du numérique » et « Innovation » (phase 2). Jamais rendue sur mobile.
  "HP-07": {
    libelle: "Bannière inter-sections 2",
    page: "accueil",
    type: "banner",
    emplacement: "ACCUEIL",
    formats: { desktop: BANNIERE.desktop, tablet: BANNIERE.tablet },
    phase: 2,
  },
  "HP-08": { libelle: "Espace vidéo présenté par", page: "accueil", type: "sponsor", emplacement: null, formats: { desktop: { w: 120, h: 40 }, tablet: { w: 120, h: 40 }, mobile: { w: 100, h: 34 } }, phase: 3 },
  "HP-09": { libelle: "Newsletter offerte par", page: "accueil", type: "sponsor", emplacement: null, formats: { desktop: { w: 120, h: 40 }, tablet: { w: 120, h: 40 }, mobile: { w: 100, h: 34 } }, phase: 2 },
  "HP-10": {
    libelle: "Mur des partenaires",
    page: "toutes",
    type: "logos",
    emplacement: "SPONSORS",
    formats: { desktop: { w: 200, h: 80 }, tablet: { w: 200, h: 80 }, mobile: { w: 160, h: 64 } },
    maisons: ["devenir-partenaire"],
    phase: 1,
  },

  // ── Articles ─────────────────────────────────────────────────────────────────────────────
  // ART-01 : emplacement « avant le texte » déjà en service, conservé (format bannière standard).
  "ART-01": { libelle: "Bannière d'ouverture", page: "article", type: "banner", emplacement: "ARTICLE_HAUT", formats: BANNIERE, phase: 2 },
  "ART-02": {
    libelle: "Rectangle in-article (après le 3e paragraphe ; second au-delà de 1 200 mots)",
    page: "article",
    type: "rectangle",
    emplacement: "ARTICLE_MILIEU",
    formats: RECTANGLE,
    maisons: ["newsletter", "whatsapp"],
    phase: 1,
  },
  "ART-03": { libelle: "Colonne latérale sticky", page: "article", type: "halfpage", emplacement: null, formats: { desktop: { w: 300, h: 600 } }, phase: 2 },
  "ART-04": {
    libelle: "Bandeau de fin d'article",
    page: "article",
    type: "banner",
    emplacement: "ARTICLE_BAS",
    formats: BANNIERE,
    maisons: ["devenir-partenaire"],
    phase: 1,
  },

  // ── Rubriques ────────────────────────────────────────────────────────────────────────────
  "RUB-01": { libelle: "Bandeau sponsor de rubrique", page: "rubrique", type: "sponsor", emplacement: null, formats: { desktop: { w: 120, h: 40 }, tablet: { w: 120, h: 40 }, mobile: { w: 100, h: 34 } }, phase: 2 },
  "RUB-02": { libelle: "Bannière dans la liste (après le 6e article)", page: "rubrique", type: "banner", emplacement: null, formats: BANNIERE, phase: 2 },
} satisfies Record<string, ConfigEmplacement>;

export type CodeEmplacement = keyof typeof adSlots;

/** Densité maximale d'encarts display visibles sur la page d'accueil. */
export const densite = { desktop: 4, mobile: 3 } as const;
