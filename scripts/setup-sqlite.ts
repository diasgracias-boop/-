/**
 * SQLite用初期セットアップスクリプト
 * Windows（管理者権限なし）での動作確認用
 *
 * 実行: bun run scripts/setup-sqlite.ts
 */
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "prisma", "dev.db");
const client = createClient({ url: `file:${DB_PATH}` });

async function run() {
  console.log("SQLiteデータベースをセットアップしています...");
  console.log(`DB: ${DB_PATH}`);

  // テーブル作成
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "User" (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS "Device" (
      id TEXT PRIMARY KEY,
      "deviceCode" TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      model TEXT NOT NULL,
      ref TEXT,
      dealer TEXT,
      department TEXT,
      "serialNumber" TEXT,
      location TEXT NOT NULL,
      "purchaseDate" TEXT,
      "usefulLifeYears" INTEGER,
      price REAL,
      "endOfSaleDate" TEXT,
      "endOfServiceDate" TEXT,
      "warrantyExpiry" TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      "disposalStatus" TEXT,
      "disposalDate" TEXT,
      "inactiveDate" TEXT,
      notes TEXT,
      "inspectionNotes" TEXT,
      "inspectionIntervalMonths" INTEGER,
      "batteryReplacementIntervalYears" INTEGER,
      "lastBatteryReplacementDate" TEXT,
      "consumableName" TEXT,
      "lastConsumableReplacementDate" TEXT,
      "lastConsumableSpareReplacementDate" TEXT,
      "isCleanField" INTEGER NOT NULL DEFAULT 0,
      "cleanFieldCategory" TEXT,
      "photoUrl" TEXT,
      "attachmentUrl" TEXT,
      "catalogUrl" TEXT,
      "manualUrl" TEXT,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS "MaintenanceLog" (
      id TEXT PRIMARY KEY,
      "deviceId" TEXT NOT NULL,
      "performedBy" TEXT NOT NULL,
      "userId" TEXT,
      "performedAt" TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      result TEXT,
      "nextSchedule" TEXT,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY ("deviceId") REFERENCES "Device"(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "RepairLog" (
      id TEXT PRIMARY KEY,
      "deviceId" TEXT NOT NULL,
      "reportedBy" TEXT NOT NULL,
      "userId" TEXT,
      "reportedAt" TEXT NOT NULL,
      symptom TEXT NOT NULL,
      cause TEXT,
      action TEXT,
      "resolvedAt" TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      cost REAL,
      vendor TEXT,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY ("deviceId") REFERENCES "Device"(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "InspectionSchedule" (
      id TEXT PRIMARY KEY,
      "deviceId" TEXT NOT NULL,
      "scheduledAt" TEXT NOT NULL,
      "intervalDays" INTEGER NOT NULL,
      description TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      "completedAt" TEXT,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY ("deviceId") REFERENCES "Device"(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "Session" (
      id TEXT PRIMARY KEY,
      "sessionToken" TEXT NOT NULL UNIQUE,
      "userId" TEXT NOT NULL,
      expires TEXT NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "Account" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      "refresh_token" TEXT,
      "access_token" TEXT,
      "expires_at" INTEGER,
      "token_type" TEXT,
      scope TEXT,
      "id_token" TEXT,
      "session_state" TEXT,
      UNIQUE(provider, "providerAccountId"),
      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
    );
  `);

  // 管理者ユーザー作成
  const adminHash = await bcrypt.hash("admin1234", 10);
  const adminId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT OR IGNORE INTO "User" (id, email, name, password, role, "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, 'ADMIN', datetime('now'), datetime('now'))`,
    args: [adminId, "admin@hospital.jp", "管理者", adminHash],
  });

  console.log("\n✅ セットアップ完了！");
  console.log("ログイン情報:");
  console.log("  メール:     admin@hospital.jp");
  console.log("  パスワード: admin1234");
  console.log("\n次のコマンドでアプリを起動:");
  console.log("  bun run dev");
}

run().catch(console.error).finally(() => client.close());
