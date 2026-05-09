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
CREATE TABLE IF NOT EXISTS "ExpertRole" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "Task" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "userInput" TEXT NOT NULL,
  "selectedRoleIds" TEXT NOT NULL,
  "finalSummary" TEXT,
  "workflowType" TEXT NOT NULL DEFAULT 'expert',
  "productId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "targetPet" TEXT NOT NULL,
  "price" TEXT,
  "costPrice" TEXT,
  "salePrice" TEXT,
  "stock" TEXT,
  "shippingTime" TEXT,
  "material" TEXT,
  "size" TEXT,
  "sellingPoints" TEXT NOT NULL,
  "mainSellingPoint" TEXT,
  "targetAudience" TEXT,
  "painPoints" TEXT,
  "forbiddenWords" TEXT,
  "competitorPrice" TEXT,
  "differentiation" TEXT,
  "suitableForAds" TEXT,
  "suitableForKoc" TEXT,
  "cautions" TEXT,
  "scenes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ContentAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "tags" TEXT,
  "source" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CalendarItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT,
  "day" INTEGER NOT NULL,
  "topic" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "angle" TEXT NOT NULL,
  "assetTitle" TEXT,
  "goal" TEXT,
  "publishAt" TEXT,
  "noteUrl" TEXT,
  "metrics" TEXT,
  "reviewNote" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CompetitorAnalysis" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "competitorName" TEXT,
  "price" TEXT,
  "noteText" TEXT NOT NULL,
  "sellingPoints" TEXT,
  "userQuestions" TEXT,
  "weakness" TEXT,
  "opportunities" TEXT,
  "result" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DataReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "metrics" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ExpertRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "output" TEXT,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpertRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExpertRun_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ExpertRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExpertRole_name_key" ON "ExpertRole"("name");
CREATE INDEX IF NOT EXISTS "ExpertRun_taskId_idx" ON "ExpertRun"("taskId");
CREATE INDEX IF NOT EXISTS "ExpertRun_roleId_idx" ON "ExpertRun"("roleId");
CREATE INDEX IF NOT EXISTS "ContentAsset_productId_idx" ON "ContentAsset"("productId");
CREATE INDEX IF NOT EXISTS "ContentAsset_type_idx" ON "ContentAsset"("type");
CREATE INDEX IF NOT EXISTS "CalendarItem_productId_idx" ON "CalendarItem"("productId");
CREATE INDEX IF NOT EXISTS "CalendarItem_day_idx" ON "CalendarItem"("day");
`);

addColumnIfMissing("Task", "workflowType", '"workflowType" TEXT NOT NULL DEFAULT \'expert\'');
addColumnIfMissing("Task", "productId", '"productId" TEXT');
addColumnIfMissing("Product", "costPrice", '"costPrice" TEXT');
addColumnIfMissing("Product", "salePrice", '"salePrice" TEXT');
addColumnIfMissing("Product", "stock", '"stock" TEXT');
addColumnIfMissing("Product", "shippingTime", '"shippingTime" TEXT');
addColumnIfMissing("Product", "mainSellingPoint", '"mainSellingPoint" TEXT');
addColumnIfMissing("Product", "targetAudience", '"targetAudience" TEXT');
addColumnIfMissing("Product", "painPoints", '"painPoints" TEXT');
addColumnIfMissing("Product", "forbiddenWords", '"forbiddenWords" TEXT');
addColumnIfMissing("Product", "competitorPrice", '"competitorPrice" TEXT');
addColumnIfMissing("Product", "differentiation", '"differentiation" TEXT');
addColumnIfMissing("Product", "suitableForAds", '"suitableForAds" TEXT');
addColumnIfMissing("Product", "suitableForKoc", '"suitableForKoc" TEXT');
addColumnIfMissing("CalendarItem", "goal", '"goal" TEXT');
addColumnIfMissing("CalendarItem", "publishAt", '"publishAt" TEXT');
addColumnIfMissing("CalendarItem", "noteUrl", '"noteUrl" TEXT');
addColumnIfMissing("CalendarItem", "metrics", '"metrics" TEXT');
addColumnIfMissing("CalendarItem", "reviewNote", '"reviewNote" TEXT');
addColumnIfMissing("CompetitorAnalysis", "competitorName", '"competitorName" TEXT');
addColumnIfMissing("CompetitorAnalysis", "price", '"price" TEXT');
addColumnIfMissing("CompetitorAnalysis", "sellingPoints", '"sellingPoints" TEXT');
addColumnIfMissing("CompetitorAnalysis", "userQuestions", '"userQuestions" TEXT');
addColumnIfMissing("CompetitorAnalysis", "weakness", '"weakness" TEXT');
addColumnIfMissing("CompetitorAnalysis", "opportunities", '"opportunities" TEXT');
db.exec('CREATE INDEX IF NOT EXISTS "Task_productId_idx" ON "Task"("productId");');

db.close();
console.log(`SQLite database initialized at ${dbPath}`);
