-- CreateEnum
CREATE TYPE "EmplacementPub" AS ENUM ('HAUT_PAGE', 'ACCUEIL', 'ARTICLE_HAUT', 'ARTICLE_BAS', 'BARRE_LATERALE', 'SPONSORS', 'NEWSLETTER');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "partenaire" TEXT;

-- AlterTable
ALTER TABLE "Rubrique" ADD COLUMN     "sponsorLien" TEXT,
ADD COLUMN     "sponsorLogoUrl" TEXT,
ADD COLUMN     "sponsorNom" TEXT;

-- CreateTable
CREATE TABLE "Publicite" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "annonceur" TEXT NOT NULL,
    "emplacement" "EmplacementPub" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL,
    "lien" TEXT NOT NULL,
    "debut" TIMESTAMP(3),
    "fin" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "poids" INTEGER NOT NULL DEFAULT 1,
    "affichages" INTEGER NOT NULL DEFAULT 0,
    "clics" INTEGER NOT NULL DEFAULT 0,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publicite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeAnnonceur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "offre" TEXT,
    "message" TEXT NOT NULL,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "traitee" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeAnnonceur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Publicite_emplacement_actif_idx" ON "Publicite"("emplacement", "actif");
