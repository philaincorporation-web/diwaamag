-- CreateEnum
CREATE TYPE "ZoneVeille" AS ENUM ('GABON', 'AFRIQUE_CENTRALE', 'AFRIQUE_OUEST', 'AFRIQUE_EST', 'AFRIQUE_AUSTRALE', 'AFRIQUE_NORD', 'INTERNATIONAL', 'NON_PRECISE');

-- AlterTable
ALTER TABLE "AbonnementPush" ADD COLUMN     "articles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "categoriesVeille" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "langue" TEXT NOT NULL DEFAULT 'fr',
ADD COLUMN     "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "veille" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zonesVeille" "ZoneVeille"[] DEFAULT ARRAY[]::"ZoneVeille"[];

-- CreateTable
CREATE TABLE "SourceVeille" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "siteUrl" TEXT,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "zoneParDefaut" "ZoneVeille",
    "categorieParDefaut" TEXT,
    "filtrerTech" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dernierReleve" TIMESTAMP(3),
    "dernierStatut" TEXT,
    "derniereErreur" TEXT,
    "derniersAjouts" INTEGER,
    "echecsConsecutifs" INTEGER NOT NULL DEFAULT 0,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceVeille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorieVeille" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "nomEn" TEXT NOT NULL,
    "motsCles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategorieVeille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualiteVeille" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "extrait" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlCanonique" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "imageUrl" TEXT,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "datePublication" TIMESTAMP(3) NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "zone" "ZoneVeille" NOT NULL DEFAULT 'NON_PRECISE',
    "masquee" BOOLEAN NOT NULL DEFAULT false,
    "notifiee" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActualiteVeille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationVeille" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "actualiteId" TEXT NOT NULL,
    "envoyee" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationVeille_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceVeille_url_key" ON "SourceVeille"("url");

-- CreateIndex
CREATE UNIQUE INDEX "CategorieVeille_slug_key" ON "CategorieVeille"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ActualiteVeille_urlCanonique_key" ON "ActualiteVeille"("urlCanonique");

-- CreateIndex
CREATE INDEX "ActualiteVeille_datePublication_idx" ON "ActualiteVeille"("datePublication");

-- CreateIndex
CREATE INDEX "ActualiteVeille_empreinte_idx" ON "ActualiteVeille"("empreinte");

-- CreateIndex
CREATE INDEX "ActualiteVeille_masquee_datePublication_idx" ON "ActualiteVeille"("masquee", "datePublication");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationVeille_abonnementId_actualiteId_key" ON "NotificationVeille"("abonnementId", "actualiteId");

-- AddForeignKey
ALTER TABLE "ActualiteVeille" ADD CONSTRAINT "ActualiteVeille_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceVeille"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationVeille" ADD CONSTRAINT "NotificationVeille_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "AbonnementPush"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationVeille" ADD CONSTRAINT "NotificationVeille_actualiteId_fkey" FOREIGN KEY ("actualiteId") REFERENCES "ActualiteVeille"("id") ON DELETE CASCADE ON UPDATE CASCADE;
