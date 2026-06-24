import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function createPrisma() {
  const url = process.env.DATABASE_URL!;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (url.startsWith("file:") || url.startsWith("libsql:")) {
    const { createClient } = require("@libsql/client");
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const adapter = new PrismaLibSql(createClient({ url }));
    return new PrismaClient({ adapter });
  }
  const { PrismaPg } = require("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

const prisma = createPrisma();

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

  // 清潔野機器（滅菌前点検用）
  const cfDevice1 = await prisma.device.upsert({
    where: { deviceCode: "CF-001" },
    update: {},
    create: {
      deviceCode: "CF-001",
      name: "硬性内視鏡（腹腔鏡）",
      category: "内視鏡",
      manufacturer: "オリンパス",
      model: "A57090A",
      serialNumber: "CF-SN-001",
      location: "手術室",
      status: "ACTIVE",
      isCleanField: true,
      cleanFieldCategory: "内視鏡",
      cleanFieldDefaultCount: 2,
      cleanFieldCurrentCount: 2,
    },
  });

  const cfDevice2 = await prisma.device.upsert({
    where: { deviceCode: "CF-002" },
    update: {},
    create: {
      deviceCode: "CF-002",
      name: "把持鉗子",
      category: "手術器具",
      manufacturer: "カールストルツ",
      model: "33310KL",
      serialNumber: "CF-SN-002",
      location: "手術室",
      status: "ACTIVE",
      isCleanField: true,
      cleanFieldCategory: "鉗子類",
      cleanFieldDefaultCount: 4,
      cleanFieldCurrentCount: 4,
    },
  });

  const cfDevice3 = await prisma.device.upsert({
    where: { deviceCode: "CF-003" },
    update: {},
    create: {
      deviceCode: "CF-003",
      name: "超音波凝固切開装置",
      category: "エネルギーデバイス",
      manufacturer: "エシコン",
      model: "HARMONIC ACE+7",
      serialNumber: "CF-SN-003",
      location: "手術室",
      status: "ACTIVE",
      isCleanField: true,
      cleanFieldCategory: "エネルギー",
      cleanFieldDefaultCount: 1,
      cleanFieldCurrentCount: 1,
    },
  });

  // 滅菌前点検サンプルデータ
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  await prisma.sterilizationCheck.createMany({
    data: [
      {
        deviceId: cfDevice1.id,
        inspectedBy: "ME1",
        judgment: "OK",
        notes: `${todayStr} 午前（第1回）`,
        inspectedAt: new Date(`${todayStr}T08:30`),
      },
      {
        deviceId: cfDevice2.id,
        inspectedBy: "ME1",
        judgment: "OK",
        notes: `${todayStr} 午前（第1回）`,
        inspectedAt: new Date(`${todayStr}T08:32`),
      },
      {
        deviceId: cfDevice3.id,
        inspectedBy: "ME2",
        judgment: "NG",
        notes: `${todayStr} 午前（第1回）`,
        inspectedAt: new Date(`${todayStr}T08:35`),
      },
      {
        deviceId: cfDevice1.id,
        inspectedBy: "ME3",
        judgment: "OK",
        notes: `${yesterdayStr} 午後（第1回）`,
        inspectedAt: new Date(`${yesterdayStr}T14:00`),
      },
      {
        deviceId: cfDevice2.id,
        inspectedBy: "ME3",
        judgment: "OK",
        notes: `${yesterdayStr} 午後（第1回）`,
        inspectedAt: new Date(`${yesterdayStr}T14:05`),
      },
    ],
    skipDuplicates: false,
  });

  console.log("シードデータの投入が完了しました");
  console.log("管理者: admin@hospital.jp / admin1234");
  console.log("スタッフ: staff@hospital.jp / user1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
