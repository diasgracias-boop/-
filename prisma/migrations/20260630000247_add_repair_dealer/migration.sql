-- AlterTable
ALTER TABLE "RepairLog" ADD COLUMN     "dealerId" TEXT;

-- CreateIndex
CREATE INDEX "RepairLog_dealerId_idx" ON "RepairLog"("dealerId");

-- AddForeignKey
ALTER TABLE "RepairLog" ADD CONSTRAINT "RepairLog_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
