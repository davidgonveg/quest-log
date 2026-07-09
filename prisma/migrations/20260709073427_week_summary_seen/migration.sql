-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Week" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "closedAt" DATETIME,
    "penaltyMsg" TEXT,
    "msgSeen" BOOLEAN NOT NULL DEFAULT false,
    "summarySeen" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Week" ("closedAt", "endDate", "id", "msgSeen", "penaltyMsg", "startDate") SELECT "closedAt", "endDate", "id", "msgSeen", "penaltyMsg", "startDate" FROM "Week";
DROP TABLE "Week";
ALTER TABLE "new_Week" RENAME TO "Week";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
