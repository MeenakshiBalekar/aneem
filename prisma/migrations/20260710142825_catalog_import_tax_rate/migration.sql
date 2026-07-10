-- AlterEnum
ALTER TYPE "SyncJobType" ADD VALUE 'CATALOG_IMPORT';

-- AlterTable
ALTER TABLE "ProductCost" ADD COLUMN     "taxRatePercent" DECIMAL(5,2);
