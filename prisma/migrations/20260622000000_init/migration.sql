-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'REPAIR', 'RETIRED');

-- CreateEnum
CREATE TYPE "DisposalStatus" AS ENUM ('DISPOSED', 'INACTIVE');

-- CreateTable
CREATE TABLE "Device" (
    "id"                                    TEXT NOT NULL,
    "deviceCode"                            TEXT NOT NULL,
    "name"                                  TEXT NOT NULL,
    "category"                              TEXT NOT NULL,
    "manufacturer"                          TEXT NOT NULL,
    "model"                                 TEXT NOT NULL,
    "ref"                                   TEXT,
    "dealer"                                TEXT,
    "department"                            TEXT,
    "serialNumber"                          TEXT,
    "location"                              TEXT NOT NULL,
    "purchaseDate"                          TIMESTAMP(3),
    "usefulLifeYears"                       INTEGER,
    "price"                                 DOUBLE PRECISION,
    "endOfSaleDate"                         TIMESTAMP(3),
    "endOfServiceDate"                      TIMESTAMP(3),
    "warrantyExpiry"                        TIMESTAMP(3),
    "status"                                "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "disposalStatus"                        "DisposalStatus",
    "disposalDate"                          TIMESTAMP(3),
    "inactiveDate"                          TIMESTAMP(3),
    "notes"                                 TEXT,
    "inspectionNotes"                       TEXT,
    "inspectionIntervalMonths"              INTEGER,
    "batteryReplacementIntervalYears"       INTEGER,
    "lastBatteryReplacementDate"            TIMESTAMP(3),
    "consumableName"                        TEXT,
    "lastConsumableReplacementDate"         TIMESTAMP(3),
    "lastConsumableSpareReplacementDate"    TIMESTAMP(3),
    "isCleanField"                          BOOLEAN NOT NULL DEFAULT false,
    "cleanFieldCategory"                    TEXT,
    "photoUrl"                              TEXT,
    "attachmentUrl"                         TEXT,
    "catalogUrl"                            TEXT,
    "manualUrl"                             TEXT,
    "createdAt"                             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id"            TEXT NOT NULL,
    "deviceId"      TEXT NOT NULL,
    "performedBy"   TEXT NOT NULL,
    "performedAt"   TIMESTAMP(3) NOT NULL,
    "type"          TEXT NOT NULL,
    "description"   TEXT NOT NULL,
    "result"        TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairLog" (
    "id"            TEXT NOT NULL,
    "deviceId"      TEXT NOT NULL,
    "reportedBy"    TEXT NOT NULL,
    "reportedAt"    TIMESTAMP(3) NOT NULL,
    "symptom"       TEXT NOT NULL,
    "cause"         TEXT,
    "action"        TEXT,
    "status"        TEXT NOT NULL DEFAULT 'OPEN',
    "cost"          DOUBLE PRECISION,
    "vendor"        TEXT,
    "resolvedAt"    TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionSchedule" (
    "id"            TEXT NOT NULL,
    "deviceId"      TEXT NOT NULL,
    "scheduledAt"   TIMESTAMP(3) NOT NULL,
    "intervalDays"  INTEGER NOT NULL,
    "description"   TEXT NOT NULL,
    "completed"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id"            TEXT NOT NULL,
    "name"          TEXT,
    "email"         TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password"      TEXT,
    "image"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "type"              TEXT NOT NULL,
    "provider"          TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token"     TEXT,
    "access_token"      TEXT,
    "expires_at"        INTEGER,
    "token_type"        TEXT,
    "scope"             TEXT,
    "id_token"          TEXT,
    "session_state"     TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id"           TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "expires"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceCode_key" ON "Device"("deviceCode");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepairLog" ADD CONSTRAINT "RepairLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InspectionSchedule" ADD CONSTRAINT "InspectionSchedule_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
