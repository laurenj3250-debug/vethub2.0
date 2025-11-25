-- AlterTable: Add isRecurring flag and subtask support to Task model
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "parentTaskId" TEXT;

-- CreateIndex: Add index on parentTaskId for subtask queries
CREATE INDEX IF NOT EXISTS "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- CreateIndex: Add index on isRecurring for daily reset queries
CREATE INDEX IF NOT EXISTS "Task_isRecurring_idx" ON "Task"("isRecurring");

-- AddForeignKey: Self-referential relation for subtasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Task_parentTaskId_fkey'
        AND table_name = 'Task'
    ) THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey"
        FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
