-- CreateTable
CREATE TABLE "SavedRoundsSheet" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "patients" JSONB NOT NULL,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedRoundsSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedRoundsSheet_date_key" ON "SavedRoundsSheet"("date");

-- CreateIndex
CREATE INDEX "SavedRoundsSheet_date_idx" ON "SavedRoundsSheet"("date");

-- CreateIndex
CREATE INDEX "SavedRoundsSheet_updatedAt_idx" ON "SavedRoundsSheet"("updatedAt");
