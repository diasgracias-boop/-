-- CreateEnum
CREATE TYPE "DisposalStatus" AS ENUM ('DISPOSED', 'INACTIVE');

-- AlterTable
ALTER TABLE "Device"
  ADD COLUMN "ref"                               TEXT,
  ADD COLUMN "dealer"                            TEXT,
  ADD COLUMN "department"                        TEXT,
  ADD COLUMN "usefulLifeYears"                   INTEGER,
  ADD COLUMN "price"                             DOUBLE PRECISION,
  ADD COLUMN "endOfSaleDate"                     TIMESTAMP(3),
  ADD COLUMN "endOfServiceDate"                  TIMESTAMP(3),
  ADD COLUMN "disposalStatus"                    "DisposalStatus",
  ADD COLUMN "disposalDate"                      TIMESTAMP(3),
  ADD COLUMN "inactiveDate"                      TIMESTAMP(3),
  ADD COLUMN "inspectionNotes"                   TEXT,
  ADD COLUMN "inspectionIntervalMonths"          INTEGER,
  ADD COLUMN "batteryReplacementIntervalYears"   INTEGER,
  ADD COLUMN "lastBatteryReplacementDate"        TIMESTAMP(3),
  ADD COLUMN "consumableName"                    TEXT,
  ADD COLUMN "lastConsumableReplacementDate"     TIMESTAMP(3),
  ADD COLUMN "lastConsumableSpareReplacementDate" TIMESTAMP(3),
  ADD COLUMN "isCleanField"                      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cleanFieldCategory"                TEXT,
  ADD COLUMN "photoUrl"                          TEXT;
