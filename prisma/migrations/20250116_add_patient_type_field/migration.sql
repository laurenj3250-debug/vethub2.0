-- Add type column to Patient table (nullable to avoid migration failures)
ALTER TABLE "Patient" ADD COLUMN "type" TEXT DEFAULT 'Medical';

-- Add comment for documentation
COMMENT ON COLUMN "Patient"."type" IS 'Patient type: Medical | MRI | Surgery (nullable until all records updated)';
