-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "OperationReading" ADD COLUMN     "medicines" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "watered" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserPermissions" (
    "userId" TEXT NOT NULL,
    "viewOperations" BOOLEAN NOT NULL DEFAULT true,
    "viewSales" BOOLEAN NOT NULL DEFAULT true,
    "viewInventory" BOOLEAN NOT NULL DEFAULT true,
    "viewExpenses" BOOLEAN NOT NULL DEFAULT true,
    "viewCustody" BOOLEAN NOT NULL DEFAULT true,
    "viewReports" BOOLEAN NOT NULL DEFAULT true,
    "editOperations" BOOLEAN NOT NULL DEFAULT false,
    "editSales" BOOLEAN NOT NULL DEFAULT false,
    "editInventory" BOOLEAN NOT NULL DEFAULT false,
    "editExpenses" BOOLEAN NOT NULL DEFAULT false,
    "editCustody" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermissions_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserPermissions" ADD CONSTRAINT "UserPermissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
