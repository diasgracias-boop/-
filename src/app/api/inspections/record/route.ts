import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 点検実施の登録
// 実施した点検（完了済み）を記録し、前回の点検日（実施日）＋点検周期で
// 次回の点検予定を自動作成する。
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const deviceId: string = body.deviceId;
  const intervalDays: number = body.intervalDays;
  const description: string = body.description;
  const completedBy: string | undefined = body.completedBy || undefined;
  const completedAt: Date = body.completedAt ? new Date(body.completedAt) : new Date();
  const measurements: {
    name: string;
    category?: string | null;
    lowerLimit?: number | null;
    upperLimit?: number | null;
    measuredValue?: number | null;
    judgment?: string | null;
  }[] = body.measurements ?? [];

  // 実施済みの点検記録を作成
  const record = await prisma.inspectionSchedule.create({
    data: {
      deviceId,
      scheduledAt: completedAt,
      intervalDays,
      description,
      completed: true,
      completedAt,
      completedBy: completedBy ?? null,
      items: measurements.length > 0
        ? {
            create: measurements.map((m) => ({
              name: m.name,
              category: m.category ?? undefined,
              lowerLimit: m.lowerLimit ?? null,
              upperLimit: m.upperLimit ?? null,
              measuredValue: m.measuredValue ?? null,
              judgment: m.judgment ?? null,
            })),
          }
        : undefined,
    },
    include: { items: true },
  });

  // 次回点検予定 = 前回の点検日（実施日）＋ 点検周期
  const nextDate = new Date(completedAt);
  nextDate.setDate(nextDate.getDate() + intervalDays);

  const deviceItems = await prisma.deviceInspectionItem.findMany({
    where: { deviceId },
    orderBy: { sortOrder: "asc" },
  });

  await prisma.inspectionSchedule.create({
    data: {
      deviceId,
      scheduledAt: nextDate,
      intervalDays,
      description,
      items: deviceItems.length > 0
        ? {
            create: deviceItems.map((item) => ({
              name: item.name,
              category: item.category,
              lowerLimit: item.lowerLimit,
              upperLimit: item.upperLimit,
            })),
          }
        : undefined,
    },
  });

  return NextResponse.json(record);
}
