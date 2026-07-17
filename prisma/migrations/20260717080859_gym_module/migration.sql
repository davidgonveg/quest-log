-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "muscleGroup" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GymEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" REAL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GymEntry_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecurringGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "longTermGoalId" TEXT,
    "targetDays" INTEGER,
    "habitDifficulty" TEXT,
    "isGym" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringGoal_longTermGoalId_fkey" FOREIGN KEY ("longTermGoalId") REFERENCES "LongTermGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RecurringGoal" ("active", "createdAt", "habitDifficulty", "id", "isCritical", "longTermGoalId", "targetDays", "title") SELECT "active", "createdAt", "habitDifficulty", "id", "isCritical", "longTermGoalId", "targetDays", "title" FROM "RecurringGoal";
DROP TABLE "RecurringGoal";
ALTER TABLE "new_RecurringGoal" RENAME TO "RecurringGoal";
CREATE TABLE "new_WeeklyGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekId" TEXT NOT NULL,
    "longTermGoalId" TEXT,
    "title" TEXT NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "targetDays" INTEGER,
    "habitDifficulty" TEXT,
    "isGym" BOOLEAN NOT NULL DEFAULT false,
    "sourceRecurringId" TEXT,
    CONSTRAINT "WeeklyGoal_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyGoal_longTermGoalId_fkey" FOREIGN KEY ("longTermGoalId") REFERENCES "LongTermGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WeeklyGoal_sourceRecurringId_fkey" FOREIGN KEY ("sourceRecurringId") REFERENCES "RecurringGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WeeklyGoal" ("habitDifficulty", "id", "isCritical", "longTermGoalId", "sourceRecurringId", "status", "targetDays", "title", "weekId") SELECT "habitDifficulty", "id", "isCritical", "longTermGoalId", "sourceRecurringId", "status", "targetDays", "title", "weekId" FROM "WeeklyGoal";
DROP TABLE "WeeklyGoal";
ALTER TABLE "new_WeeklyGoal" RENAME TO "WeeklyGoal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
