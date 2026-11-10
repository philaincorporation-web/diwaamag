-- AlterTable
ALTER TABLE "Rubrique" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "nomEn" TEXT;

-- CreateTable
CREATE TABLE "ArticleTraduction" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "langue" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "chapeau" TEXT NOT NULL,
    "contenu" JSONB NOT NULL,
    "automatique" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleTraduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTraduction_articleId_langue_key" ON "ArticleTraduction"("articleId", "langue");

-- AddForeignKey
ALTER TABLE "ArticleTraduction" ADD CONSTRAINT "ArticleTraduction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
