-- CreateTable
CREATE TABLE "MessageContact" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "emailEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageContact_lu_creeLe_idx" ON "MessageContact"("lu", "creeLe");
