-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatutArticle" AS ENUM ('BROUILLON', 'PROGRAMME', 'PUBLIE', 'ARCHIVE', 'CORBEILLE');

-- CreateEnum
CREATE TYPE "TypeContenu" AS ENUM ('ACTUALITE', 'INTERVIEW', 'DOSSIER', 'VIDEO');

-- CreateEnum
CREATE TYPE "FamilleRubrique" AS ENUM ('GEOGRAPHIQUE', 'THEMATIQUE');

-- CreateEnum
CREATE TYPE "TypeMedia" AS ENUM ('IMAGE', 'VIDEO', 'PDF');

-- CreateEnum
CREATE TYPE "StatutCommentaire" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE', 'SIGNALE');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "derniereConnexion" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "chapeau" TEXT NOT NULL,
    "contenu" JSONB NOT NULL,
    "imageUneUrl" TEXT,
    "imageUneAlt" TEXT,
    "videoUrl" TEXT,
    "type" "TypeContenu" NOT NULL DEFAULT 'ACTUALITE',
    "statut" "StatutArticle" NOT NULL DEFAULT 'BROUILLON',
    "aLaUne" BOOLEAN NOT NULL DEFAULT false,
    "ordreUne" INTEGER,
    "tempsLecture" INTEGER,
    "vues" INTEGER NOT NULL DEFAULT 0,
    "metaTitre" TEXT,
    "metaDescription" TEXT,
    "datePublication" TIMESTAMP(3),
    "dateProgrammee" TIMESTAMP(3),
    "dateMiseAJour" TIMESTAMP(3),
    "auteurId" TEXT NOT NULL,
    "rubriqueId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleVersion" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" JSONB NOT NULL,
    "modifieParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubrique" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "famille" "FamilleRubrique" NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "couleur" TEXT,

    CONSTRAINT "Rubrique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotCle" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "MotCle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleMotCle" (
    "articleId" TEXT NOT NULL,
    "motCleId" TEXT NOT NULL,

    CONSTRAINT "ArticleMotCle_pkey" PRIMARY KEY ("articleId","motCleId")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "type" "TypeMedia" NOT NULL,
    "legende" TEXT,
    "texteAlternatif" TEXT NOT NULL,
    "largeur" INTEGER,
    "hauteur" INTEGER,
    "ajouteParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commentaire" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "parentId" TEXT,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lien" TEXT,
    "statut" "StatutCommentaire" NOT NULL DEFAULT 'EN_ATTENTE',
    "signalements" INTEGER NOT NULL DEFAULT 0,
    "adresseIp" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commentaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Numero" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "mois" TIMESTAMP(3) NOT NULL,
    "couvertureUrl" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "edito" TEXT,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Numero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumeroArticle" (
    "numeroId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NumeroArticle_pkey" PRIMARY KEY ("numeroId","articleId")
);

-- CreateTable
CREATE TABLE "AbonneNewsletter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "confirme" BOOLEAN NOT NULL DEFAULT false,
    "jetonConfirmation" TEXT,
    "desinscritLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbonneNewsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonnementPush" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbonnementPush_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalActivite" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "cible" TEXT NOT NULL,
    "cibleId" TEXT,
    "details" JSONB,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalActivite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametre" (
    "cle" TEXT NOT NULL,
    "valeur" JSONB NOT NULL,

    CONSTRAINT "Parametre_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_statut_datePublication_idx" ON "Article"("statut", "datePublication");

-- CreateIndex
CREATE INDEX "Article_rubriqueId_idx" ON "Article"("rubriqueId");

-- CreateIndex
CREATE INDEX "ArticleVersion_articleId_idx" ON "ArticleVersion"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "Rubrique_nom_key" ON "Rubrique"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Rubrique_slug_key" ON "Rubrique"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MotCle_nom_key" ON "MotCle"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "MotCle_slug_key" ON "MotCle"("slug");

-- CreateIndex
CREATE INDEX "Commentaire_articleId_statut_idx" ON "Commentaire"("articleId", "statut");

-- CreateIndex
CREATE INDEX "Commentaire_email_idx" ON "Commentaire"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Numero_slug_key" ON "Numero"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AbonneNewsletter_email_key" ON "AbonneNewsletter"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AbonneNewsletter_jetonConfirmation_key" ON "AbonneNewsletter"("jetonConfirmation");

-- CreateIndex
CREATE UNIQUE INDEX "AbonnementPush_endpoint_key" ON "AbonnementPush"("endpoint");

-- CreateIndex
CREATE INDEX "JournalActivite_adminId_creeLe_idx" ON "JournalActivite"("adminId", "creeLe");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_rubriqueId_fkey" FOREIGN KEY ("rubriqueId") REFERENCES "Rubrique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleVersion" ADD CONSTRAINT "ArticleVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleVersion" ADD CONSTRAINT "ArticleVersion_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleMotCle" ADD CONSTRAINT "ArticleMotCle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleMotCle" ADD CONSTRAINT "ArticleMotCle_motCleId_fkey" FOREIGN KEY ("motCleId") REFERENCES "MotCle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commentaire" ADD CONSTRAINT "Commentaire_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commentaire" ADD CONSTRAINT "Commentaire_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Commentaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumeroArticle" ADD CONSTRAINT "NumeroArticle_numeroId_fkey" FOREIGN KEY ("numeroId") REFERENCES "Numero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumeroArticle" ADD CONSTRAINT "NumeroArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalActivite" ADD CONSTRAINT "JournalActivite_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
