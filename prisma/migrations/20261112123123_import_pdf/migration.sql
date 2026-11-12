-- CreateEnum
CREATE TYPE "StatutImport" AS ENUM ('TELEVERSE', 'EN_ATTENTE', 'EN_COURS', 'A_VERIFIER', 'TERMINE', 'ECHEC', 'ANNULE');

-- CreateTable
CREATE TABLE "ImportPdf" (
    "id" TEXT NOT NULL,
    "statut" "StatutImport" NOT NULL DEFAULT 'TELEVERSE',
    "nomFichier" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "empreinte" TEXT NOT NULL,
    "pages" INTEGER,
    "stockage" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceSupprimee" BOOLEAN NOT NULL DEFAULT false,
    "etape" TEXT,
    "progression" INTEGER NOT NULL DEFAULT 0,
    "resultat" JSONB,
    "erreur" TEXT,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "modele" TEXT,
    "tokensEntree" INTEGER,
    "tokensSortie" INTEGER,
    "debutTraitement" TIMESTAMP(3),
    "expireLe" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT NOT NULL,
    "articleId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportPdf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportPdf_articleId_key" ON "ImportPdf"("articleId");

-- CreateIndex
CREATE INDEX "ImportPdf_empreinte_idx" ON "ImportPdf"("empreinte");

-- CreateIndex
CREATE INDEX "ImportPdf_statut_idx" ON "ImportPdf"("statut");

-- AddForeignKey
ALTER TABLE "ImportPdf" ADD CONSTRAINT "ImportPdf_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportPdf" ADD CONSTRAINT "ImportPdf_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
