-- Manual SQL to add patient type column
-- Run this in Railway's PostgreSQL database console

-- Check if column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='Patient' AND column_name='type'
    ) THEN
        -- Add type column
        ALTER TABLE "Patient" ADD COLUMN "type" TEXT DEFAULT 'Medical';

        -- Add comment
        COMMENT ON COLUMN "Patient"."type" IS 'Patient type: Medical | MRI | Surgery';

        RAISE NOTICE 'Column "type" added successfully';
    ELSE
        RAISE NOTICE 'Column "type" already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Patient' AND column_name = 'type';
