-- CreateTable
CREATE TABLE "RecurringGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "longTermGoalId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringGoal_longTermGoalId_fkey" FOREIGN KEY ("longTermGoalId") REFERENCES "LongTermGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recurringGoalId" TEXT,
    "title" TEXT NOT NULL,
    "dueDay" INTEGER,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringTask_recurringGoalId_fkey" FOREIGN KEY ("recurringGoalId") REFERENCES "RecurringGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekId" TEXT NOT NULL,
    "weeklyGoalId" TEXT,
    "title" TEXT NOT NULL,
    "dueDay" INTEGER,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "sourceRecurringId" TEXT,
    "xpReward" INTEGER NOT NULL,
    "coinReward" INTEGER NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "Task_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_weeklyGoalId_fkey" FOREIGN KEY ("weeklyGoalId") REFERENCES "WeeklyGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_sourceRecurringId_fkey" FOREIGN KEY ("sourceRecurringId") REFERENCES "RecurringTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("coinReward", "completedAt", "difficulty", "dueDay", "id", "title", "weekId", "weeklyGoalId", "xpReward") SELECT "coinReward", "completedAt", "difficulty", "dueDay", "id", "title", "weekId", "weeklyGoalId", "xpReward" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE TABLE "new_WeeklyGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekId" TEXT NOT NULL,
    "longTermGoalId" TEXT,
    "title" TEXT NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sourceRecurringId" TEXT,
    CONSTRAINT "WeeklyGoal_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyGoal_longTermGoalId_fkey" FOREIGN KEY ("longTermGoalId") REFERENCES "LongTermGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WeeklyGoal_sourceRecurringId_fkey" FOREIGN KEY ("sourceRecurringId") REFERENCES "RecurringGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WeeklyGoal" ("id", "isCritical", "longTermGoalId", "status", "title", "weekId") SELECT "id", "isCritical", "longTermGoalId", "status", "title", "weekId" FROM "WeeklyGoal";
DROP TABLE "WeeklyGoal";
ALTER TABLE "new_WeeklyGoal" RENAME TO "WeeklyGoal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
