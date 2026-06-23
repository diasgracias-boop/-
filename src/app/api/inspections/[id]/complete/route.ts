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
    data: { completed: true, completedAt: new Date() },
    include: { items: true },
  });

  const nextDate = new Date(schedule.scheduledAt);
  nextDate.setDate(nextDate.getDate() + schedule.intervalDays);

  await prisma.inspectionSchedule.create({
    data: {
      deviceId: schedule.deviceId,
      scheduledAt: nextDate,
      intervalDays: schedule.intervalDays,
      description: schedule.description,
      items: schedule.items.length
        ? {
            create: schedule.items.map((item) => ({
              name: item.name,
              lowerLimit: item.lowerLimit,
              upperLimit: item.upperLimit,
            })),
          }
        : undefined,
    },
  });

  return NextResponse.json(schedule);
}
