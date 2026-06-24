-- CreateTable
CREATE TABLE "SterilizationCheck" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "inspectedBy" TEXT NOT NULL,
    "judgment" TEXT NOT NULL,
    "notes" TEXT,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SterilizationCheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SterilizationCheck" ADD CONSTRAINT "SterilizationCheck_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
