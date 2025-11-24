-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "appointmentTime" TEXT,
    "age" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recheck',
    "whyHereToday" TEXT,
    "lastVisit" TEXT,
    "mri" TEXT,
    "bloodwork" TEXT,
    "medications" TEXT,
    "changesSinceLastVisit" TEXT,
    "otherNotes" TEXT,
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_date_idx" ON "Appointment"("date");

-- CreateIndex
CREATE INDEX "Appointment_appointmentTime_idx" ON "Appointment"("appointmentTime");
