-- AlterTable: add MRI cancellation audit fields to Patient
ALTER TABLE "Patient" ADD COLUMN "mriCancelled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Patient" ADD COLUMN "mriCancelledAt" TIMESTAMP(3);
