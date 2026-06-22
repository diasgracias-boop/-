ALTER TABLE "Device" ADD COLUMN "pmdaApprovalNumber" TEXT;
ALTER TABLE "Device" ADD COLUMN "pmdaDocUpdatedAt" TEXT;
ALTER TABLE "Device" ADD COLUMN "pmdaLastCheckedAt" TIMESTAMP(3);
ALTER TABLE "Device" ADD COLUMN "pmdaUpdateAvailable" BOOLEAN NOT NULL DEFAULT false;
