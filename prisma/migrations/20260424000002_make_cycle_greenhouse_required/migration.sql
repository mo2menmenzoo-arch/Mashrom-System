-- Make Cycle.greenhouseId NOT NULL (all rows have been seeded)
ALTER TABLE "Cycle" ALTER COLUMN "greenhouseId" SET NOT NULL;

-- Drop the nullable FK and recreate as non-nullable
ALTER TABLE "Cycle" DROP CONSTRAINT "Cycle_greenhouseId_fkey";
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_greenhouseId_fkey" FOREIGN KEY ("greenhouseId") REFERENCES "Greenhouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
