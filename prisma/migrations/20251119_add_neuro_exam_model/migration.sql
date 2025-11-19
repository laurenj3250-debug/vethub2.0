-- CreateTable
CREATE TABLE "NeuroExam" (
    "id" TEXT NOT NULL,
    "patientId" INTEGER,
    "sections" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "NeuroExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NeuroExam_patientId_idx" ON "NeuroExam"("patientId");

-- CreateIndex
CREATE INDEX "NeuroExam_createdAt_idx" ON "NeuroExam"("createdAt");

-- AddForeignKey
ALTER TABLE "NeuroExam" ADD CONSTRAINT "NeuroExam_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
