-- Add type column to Patient table
ALTER TABLE "Patient" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'Medical';

-- Add comment for documentation
COMMENT ON COLUMN "Patient"."type" IS 'Patient type: Medical | MRI | Surgery';
