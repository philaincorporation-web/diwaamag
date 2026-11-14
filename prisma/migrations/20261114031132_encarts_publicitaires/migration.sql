-- CreateEnum
CREATE TYPE "LanguePub" AS ENUM ('TOUTES', 'FR', 'EN');

-- AlterEnum
ALTER TYPE "EmplacementPub" ADD VALUE 'ARTICLE_MILIEU';

-- AlterTable
ALTER TABLE "Publicite" ADD COLUMN     "imageAltEn" TEXT,
ADD COLUMN     "imageMobileUrl" TEXT,
ADD COLUMN     "langue" "LanguePub" NOT NULL DEFAULT 'TOUTES';
