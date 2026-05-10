import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = resolve(process.cwd(), "prisma", "dev.db");
mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

function addColumnIfMissing(tableName, columnName, sql) {
  const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE "${tableName}" ADD COLUMN ${sql}`);
  }
}

db.exec(`
DROP TABLE IF EXISTS "ExpertRun";
DROP TABLE IF EXISTS "Task";
DROP TABLE IF EXISTS "ExpertRole";
DROP TABLE IF EXISTS "CompetitorAnalysis";
DROP TABLE IF EXISTS "DataReview";
DROP TABLE IF EXISTS "Product";

DROP INDEX IF EXISTS "ExpertRole_name_key";
DROP INDEX IF EXISTS "ExpertRun_taskId_idx";
DROP INDEX IF EXISTS "ExpertRun_roleId_idx";
DROP INDEX IF EXISTS "ContentAsset_productId_idx";
DROP INDEX IF EXISTS "CalendarItem_productId_idx";
DROP INDEX IF EXISTS "Task_productId_idx";

CREATE TABLE IF NOT EXISTS "ContentAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "tags" TEXT,
  "source" TEXT NOT NULL,
  "parentId" TEXT,
  "variantType" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CalendarItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "day" INTEGER NOT NULL,
  "topic" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "angle" TEXT NOT NULL,
  "assetTitle" TEXT,
  "goal" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ContentAsset_type_idx" ON "ContentAsset"("type");
CREATE INDEX IF NOT EXISTS "CalendarItem_day_idx" ON "CalendarItem"("day");
`);

addColumnIfMissing("ContentAsset", "parentId", '"parentId" TEXT');
addColumnIfMissing("ContentAsset", "variantType", '"variantType" TEXT');
db.exec('CREATE INDEX IF NOT EXISTS "ContentAsset_parentId_idx" ON "ContentAsset"("parentId");');

const contentAssetColumns = db.prepare(`PRAGMA table_info("ContentAsset")`).all();
if (contentAssetColumns.some((column) => column.name === "productId")) {
  db.exec(`
    CREATE TABLE "ContentAsset_new" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "tags" TEXT,
      "source" TEXT NOT NULL,
      "parentId" TEXT,
      "variantType" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO "ContentAsset_new" ("id", "type", "title", "body", "tags", "source", "createdAt")
    SELECT "id", "type", "title", "body", "tags", "source", "createdAt" FROM "ContentAsset";
    DROP TABLE "ContentAsset";
    ALTER TABLE "ContentAsset_new" RENAME TO "ContentAsset";
    CREATE INDEX IF NOT EXISTS "ContentAsset_type_idx" ON "ContentAsset"("type");
    CREATE INDEX IF NOT EXISTS "ContentAsset_parentId_idx" ON "ContentAsset"("parentId");
  `);
}

const calendarColumns = db.prepare(`PRAGMA table_info("CalendarItem")`).all();
if (
  calendarColumns.some((column) =>
    ["productId", "publishAt", "noteUrl", "metrics", "reviewNote"].includes(String(column.name))
  )
) {
  db.exec(`
    CREATE TABLE "CalendarItem_new" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "day" INTEGER NOT NULL,
      "topic" TEXT NOT NULL,
      "format" TEXT NOT NULL,
      "angle" TEXT NOT NULL,
      "assetTitle" TEXT,
      "goal" TEXT,
      "status" TEXT NOT NULL DEFAULT 'planned',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO "CalendarItem_new" ("id", "day", "topic", "format", "angle", "assetTitle", "goal", "status", "createdAt")
    SELECT "id", "day", "topic", "format", "angle", "assetTitle", "goal", "status", "createdAt" FROM "CalendarItem";
    DROP TABLE "CalendarItem";
    ALTER TABLE "CalendarItem_new" RENAME TO "CalendarItem";
    CREATE INDEX IF NOT EXISTS "CalendarItem_day_idx" ON "CalendarItem"("day");
  `);
}

db.close();
console.log(`SQLite database initialized at ${dbPath}`);
