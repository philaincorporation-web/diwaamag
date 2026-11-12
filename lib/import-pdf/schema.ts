// Format strict du résultat d'analyse d'un PDF (sortie de l'IA ou de l'analyse heuristique).
// Validé côté serveur avant toute persistance ; partagé avec l'interface de vérification.
import { z } from "zod";

export const TYPES_BLOC = ["intertitre", "paragraphe", "citation", "liste", "encadre", "image"] as const;
export const ROLES_IMAGE = ["principale", "illustration", "portrait", "infographie", "decoration"] as const;
export const CONFIANCES = ["haute", "moyenne", "faible"] as const;

/**
 * Bloc éditorial, dans l'ordre de lecture. Schéma « à plat » (tous les champs présents,
 * null quand ils ne s'appliquent pas) pour rester compatible avec les sorties structurées.
 */
export const BlocSchema = z.object({
  type: z.enum(TYPES_BLOC),
  /** Texte fidèle au PDF. Gras **…** et italique *…* autorisés. Vide pour une image. */
  texte: z.string(),
  /** Intertitre : 2 (section) ou 3 (sous-section). */
  niveau: z.number().int().nullable(),
  /** Liste : éléments ; null sinon. */
  elements: z.array(z.string()).nullable(),
  ordonnee: z.boolean().nullable(),
  /** Citation : auteur de la citation s'il est indiqué dans le PDF. */
  attribution: z.string().nullable(),
  /** Encadré : titre éventuel. */
  titre: z.string().nullable(),
  /** Image : identifiant d'une image extraite (ex. « p2-i1 »). */
  imageId: z.string().nullable(),
  page: z.number().int().nullable(),
  /** Passage à vérifier (lecture incertaine, ordre de colonnes douteux…). */
  aVerifier: z.boolean(),
});

export const ImageAnalyseSchema = z.object({
  imageId: z.string(),
  role: z.enum(ROLES_IMAGE),
  /** Description factuelle de ce que montre l'image (texte alternatif proposé). */
  alt: z.string(),
  legende: z.string().nullable(),
  credit: z.string().nullable(),
  /** Intertitre ou début du paragraphe auquel l'image se rapporte. */
  section: z.string().nullable(),
  confiance: z.enum(CONFIANCES),
});

/** Photo repérée sur une page scannée (non extractible) : recadrée automatiquement d'après sa boîte. */
export const ZoneImageSchema = z.object({
  id: z.string(), // « p3-z1 »
  page: z.number().int(),
  /** Boîte en fraction de la page : coin haut gauche (x, y), largeur l, hauteur h. */
  boite: z.object({ x: z.number(), y: z.number(), l: z.number(), h: z.number() }),
  role: z.enum(ROLES_IMAGE),
  alt: z.string(),
  legende: z.string().nullable(),
  credit: z.string().nullable(),
  section: z.string().nullable(),
  confiance: z.enum(CONFIANCES),
});

export const AnalyseSchema = z.object({
  titre: z.string(),
  surtitre: z.string().nullable(),
  sousTitre: z.string().nullable(),
  chapeau: z.string().nullable(),
  /** Auteur(s) mentionné(s) dans le PDF — jamais deviné. */
  auteurMentionne: z.string().nullable(),
  /** Slug d'une rubrique existante proposée, ou null si aucune ne convient. */
  rubrique: z.string().nullable(),
  type: z.enum(["ACTUALITE", "INTERVIEW", "DOSSIER"]),
  blocs: z.array(BlocSchema),
  images: z.array(ImageAnalyseSchema),
  zones: z.array(ZoneImageSchema),
  imageUne: z.string().nullable(),
  seo: z.object({
    slug: z.string(),
    metaTitre: z.string(),
    metaDescription: z.string(),
    motsCles: z.array(z.string()),
  }),
  avertissements: z.array(z.string()),
});

export type Bloc = z.infer<typeof BlocSchema>;
export type ImageAnalyse = z.infer<typeof ImageAnalyseSchema>;
export type ZoneImage = z.infer<typeof ZoneImageSchema>;
export type Analyse = z.infer<typeof AnalyseSchema>;

/** Image extraite telle que conservée dans le résultat de l'import (après envoi vers le stockage). */
export const ImageStockeeSchema = z.object({
  id: z.string(),
  /** « extraite » du PDF, ou « recadree » depuis une page scannée. */
  origine: z.enum(["extraite", "recadree"]),
  page: z.number().int(),
  url: z.string(),
  publicId: z.string(),
  largeur: z.number().int(),
  hauteur: z.number().int(),
  repetitions: z.number().int(),
  boite: z.object({ x: z.number(), y: z.number(), l: z.number(), h: z.number() }),
});
export type ImageStockee = z.infer<typeof ImageStockeeSchema>;

export const ResultatImportSchema = z.object({
  analyse: AnalyseSchema,
  images: z.array(ImageStockeeSchema),
  pages: z.array(z.object({ numero: z.number().int(), scannee: z.boolean() })),
  avertissements: z.array(z.string()),
});
export type ResultatImport = z.infer<typeof ResultatImportSchema>;
