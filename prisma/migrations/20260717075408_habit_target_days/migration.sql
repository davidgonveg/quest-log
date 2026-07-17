-- AlterTable
ALTER TABLE "RecurringGoal" ADD COLUMN "habitDifficulty" TEXT;
ALTER TABLE "RecurringGoal" ADD COLUMN "targetDays" INTEGER;

-- AlterTable
ALTER TABLE "WeeklyGoal" ADD COLUMN "habitDifficulty" TEXT;
ALTER TABLE "WeeklyGoal" ADD COLUMN "targetDays" INTEGER;
