/**
 * 管理者ユーザーが存在しない場合に作成するスクリプト
 * start-local.bat から自動実行されます
 */
import bcrypt from "bcryptjs";

// 動的に prisma を取得（DATABASE_URL の種類に応じて自動選択）
const { prisma } = await import("../src/lib/prisma");

const existing = await prisma.user.findUnique({
  where: { email: "admin@hospital.jp" },
});

if (!existing) {
  const hash = await bcrypt.hash("admin1234", 10);
  await prisma.user.create({
    data: {
      email: "admin@hospital.jp",
      name: "管理者",
      password: hash,
      role: "ADMIN",
    },
  });
  console.log("✅ 管理者ユーザーを作成しました: admin@hospital.jp / admin1234");
} else {
  console.log("✅ 管理者ユーザーは既に存在します");
}

await prisma.$disconnect();
