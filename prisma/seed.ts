import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin1234", 10);
  const userPassword = await bcrypt.hash("user1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@hospital.jp" },
    update: {},
    create: {
      email: "admin@hospital.jp",
      name: "管理者",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@hospital.jp" },
    update: {},
    create: {
      email: "staff@hospital.jp",
      name: "担当スタッフ",
      password: userPassword,
      role: "USER",
    },
  });

  const device1 = await prisma.device.upsert({
    where: { deviceCode: "ECG-001" },
    update: {},
    create: {
      deviceCode: "ECG-001",
      name: "心電計",
      category: "診断機器",
      manufacturer: "日本光電",
      model: "ECG-2550",
      serialNumber: "SN-20230001",
      location: "3F 内科病棟",
      purchaseDate: new Date("2020-04-01"),
      warrantyExpiry: new Date("2025-03-31"),
      status: "ACTIVE",
      notes: "年次点検対象",
    },
  });

  const device2 = await prisma.device.upsert({
    where: { deviceCode: "MRI-001" },
    update: {},
    create: {
      deviceCode: "MRI-001",
      name: "MRI装置",
      category: "画像診断機器",
      manufacturer: "シーメンス",
      model: "MAGNETOM Lumina",
      serialNumber: "SN-20210042",
      location: "B1F 放射線科",
      purchaseDate: new Date("2021-10-01"),
      warrantyExpiry: new Date("2026-09-30"),
      status: "ACTIVE",
    },
  });

  await prisma.device.upsert({
    where: { deviceCode: "VNT-003" },
    update: {},
    create: {
      deviceCode: "VNT-003",
      name: "人工呼吸器",
      category: "治療機器",
      manufacturer: "フクダ電子",
      model: "VersaMed iVent 201",
      serialNumber: "SN-20220015",
      location: "2F ICU",
      purchaseDate: new Date("2022-01-15"),
      warrantyExpiry: new Date("2025-01-14"),
      status: "REPAIR",
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);

  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 45);

  await prisma.inspectionSchedule.createMany({
    data: [
      {
        deviceId: device1.id,
        scheduledAt: tomorrow,
        intervalDays: 365,
        description: "年次定期点検",
      },
      {
        deviceId: device2.id,
        scheduledAt: lastMonth,
        intervalDays: 180,
        description: "半年点検・キャリブレーション",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.maintenanceLog.create({
    data: {
      deviceId: device1.id,
      performedBy: "担当スタッフ",
      userId: admin.id,
      performedAt: new Date("2024-04-10"),
      type: "INSPECTION",
      description: "年次定期点検実施",
      result: "異常なし。すべての機能が正常に動作することを確認。",
      nextSchedule: tomorrow,
    },
  });

  console.log("シードデータの投入が完了しました");
  console.log("管理者: admin@hospital.jp / admin1234");
  console.log("スタッフ: staff@hospital.jp / user1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
