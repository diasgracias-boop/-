import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const schedule = await prisma.inspectionSchedule.update({
    where: { id },
    data: {
      completed: true,
      completedAt: new Date(),
    },
  });

  const nextDate = new Date(schedule.scheduledAt);
  nextDate.setDate(nextDate.getDate() + schedule.intervalDays);

  await prisma.inspectionSchedule.create({
    data: {
      deviceId: schedule.deviceId,
      scheduledAt: nextDate,
      intervalDays: schedule.intervalDays,
      description: schedule.description,
    },
  });

  return NextResponse.json(schedule);
}
