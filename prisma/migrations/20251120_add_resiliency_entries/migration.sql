-- CreateTable
CREATE TABLE "ResiliencyEntry" (
    "id" TEXT NOT NULL,
    "patientId" INTEGER NOT NULL,
    "entryText" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ResiliencyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResiliencyEntry_patientId_idx" ON "ResiliencyEntry"("patientId");

-- CreateIndex
CREATE INDEX "ResiliencyEntry_createdAt_idx" ON "ResiliencyEntry"("createdAt");

-- CreateIndex
CREATE INDEX "ResiliencyEntry_category_idx" ON "ResiliencyEntry"("category");

-- AddForeignKey
ALTER TABLE "ResiliencyEntry" ADD CONSTRAINT "ResiliencyEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
