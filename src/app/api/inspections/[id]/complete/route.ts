import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const measurements: { id: string; measuredValue?: number; judgment?: string }[] = body.measurements ?? [];
  const completedBy: string | undefined = body.completedBy || undefined;
  const completedAt: Date = body.completedAt ? new Date(body.completedAt) : new Date();

  // Update item measurements
  if (measurements.length > 0) {
    await Promise.all(
      measurements.map((m) =>
        prisma.inspectionItem.update({
          where: { id: m.id },
          data: {
            measuredValue: m.measuredValue ?? null,
            judgment: m.judgment ?? null,
          },
        })
      )
    );
  }

  const schedule = await prisma.inspectionSchedule.update({
    where: { id },
    data: { completed: true, completedAt, completedBy: completedBy ?? null },
    include: { items: true },
  });

  // 次回点検予定 = 前回の点検日（実施日）＋ 点検周期
  const nextDate = new Date(completedAt);
  nextDate.setDate(nextDate.getDate() + schedule.intervalDays);

  // Fetch current device template items for next schedule
  const deviceItems = await prisma.deviceInspectionItem.findMany({
    where: { deviceId: schedule.deviceId },
    orderBy: { sortOrder: "asc" },
  });

  await prisma.inspectionSchedule.create({
    data: {
      deviceId: schedule.deviceId,
      scheduledAt: nextDate,
      intervalDays: schedule.intervalDays,
      description: schedule.description,
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

  return NextResponse.json(schedule);
}
