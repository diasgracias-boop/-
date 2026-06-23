import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// スケジュールに点検項目がない場合、機器テンプレートから項目を生成して返す
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const schedule = await prisma.inspectionSchedule.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 既に項目がある場合はそのまま返す
  if (schedule.items.length > 0) {
    return NextResponse.json(schedule.items);
  }

  const deviceItems = await prisma.deviceInspectionItem.findMany({
    where: { deviceId: schedule.deviceId },
    orderBy: { sortOrder: "asc" },
  });

  if (deviceItems.length === 0) {
    return NextResponse.json([]);
  }

  const created = await prisma.$transaction(
    deviceItems.map((item) =>
      prisma.inspectionItem.create({
        data: {
          scheduleId: id,
          name: item.name,
          category: item.category,
          lowerLimit: item.lowerLimit,
          upperLimit: item.upperLimit,
        },
      })
    )
  );

  return NextResponse.json(created);
}
