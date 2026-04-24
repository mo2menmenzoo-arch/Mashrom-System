-- CreateEnum
CREATE TYPE "WithdrawalCategory" AS ENUM ('OPERATING', 'FOUNDING');

-- CreateTable: Greenhouse
CREATE TABLE "Greenhouse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Greenhouse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Greenhouse_organizationId_number_key" ON "Greenhouse"("organizationId", "number");
CREATE INDEX "Greenhouse_organizationId_idx" ON "Greenhouse"("organizationId");

-- AddForeignKey: Greenhouse -> Organization
ALTER TABLE "Greenhouse" ADD CONSTRAINT "Greenhouse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: Insert default Greenhouse (must exist before GreenhouseSettings FK migration)
INSERT INTO "Greenhouse" ("id", "organizationId", "name", "number", "createdAt", "updatedAt")
VALUES ('default-gh', 'default-org', 'الصوبة الرئيسية', 1, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- CreateTable: FoundingExpense
CREATE TABLE "FoundingExpense" (
    "id" TEXT NOT NULL,
    "greenhouseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "custodyWithdrawalId" TEXT,

    CONSTRAINT "FoundingExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoundingExpense_custodyWithdrawalId_key" ON "FoundingExpense"("custodyWithdrawalId");
CREATE INDEX "FoundingExpense_greenhouseId_date_idx" ON "FoundingExpense"("greenhouseId", "date");

-- AddForeignKey: FoundingExpense -> Greenhouse
ALTER TABLE "FoundingExpense" ADD CONSTRAINT "FoundingExpense_greenhouseId_fkey" FOREIGN KEY ("greenhouseId") REFERENCES "Greenhouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Cycle - add nullable greenhouseId
ALTER TABLE "Cycle" ADD COLUMN "greenhouseId" TEXT;

-- CreateIndex
CREATE INDEX "Cycle_greenhouseId_idx" ON "Cycle"("greenhouseId");

-- AddForeignKey: Cycle -> Greenhouse (nullable)
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_greenhouseId_fkey" FOREIGN KEY ("greenhouseId") REFERENCES "Greenhouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: CustodyWithdrawal - add category and linked ids
ALTER TABLE "CustodyWithdrawal" ADD COLUMN "category" "WithdrawalCategory" NOT NULL DEFAULT 'OPERATING';
ALTER TABLE "CustodyWithdrawal" ADD COLUMN "expenseId" TEXT;
ALTER TABLE "CustodyWithdrawal" ADD COLUMN "foundingExpenseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CustodyWithdrawal_expenseId_key" ON "CustodyWithdrawal"("expenseId");
CREATE UNIQUE INDEX "CustodyWithdrawal_foundingExpenseId_key" ON "CustodyWithdrawal"("foundingExpenseId");

-- AlterTable: GreenhouseSettings
-- 1. Drop old FK (references Organization) BEFORE changing the value
ALTER TABLE "GreenhouseSettings" DROP CONSTRAINT "GreenhouseSettings_organizationId_fkey";

-- 2. Update existing row to point to the new greenhouse id
UPDATE "GreenhouseSettings" SET "organizationId" = 'default-gh' WHERE "organizationId" = 'default-org';

-- 3. Drop old unique index on organizationId
DROP INDEX "GreenhouseSettings_organizationId_key";

-- 4. Rename column organizationId -> greenhouseId
ALTER TABLE "GreenhouseSettings" RENAME COLUMN "organizationId" TO "greenhouseId";

-- 5. Create new unique index for GreenhouseSettings.greenhouseId
CREATE UNIQUE INDEX "GreenhouseSettings_greenhouseId_key" ON "GreenhouseSettings"("greenhouseId");

-- 6. AddForeignKey: GreenhouseSettings -> Greenhouse
ALTER TABLE "GreenhouseSettings" ADD CONSTRAINT "GreenhouseSettings_greenhouseId_fkey" FOREIGN KEY ("greenhouseId") REFERENCES "Greenhouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
