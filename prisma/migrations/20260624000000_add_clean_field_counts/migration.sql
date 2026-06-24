-- AlterTable
ALTER TABLE "Device" ADD COLUMN "cleanFieldDefaultCount" INTEGER,
                     ADD COLUMN "cleanFieldCurrentCount" INTEGER,
                     ADD COLUMN "cleanFieldSubstituteCount" INTEGER;
