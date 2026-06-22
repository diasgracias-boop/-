-- AlterTable: add document URL fields
ALTER TABLE "Device"
  ADD COLUMN "attachmentUrl" TEXT,
  ADD COLUMN "catalogUrl"    TEXT,
  ADD COLUMN "manualUrl"     TEXT;
