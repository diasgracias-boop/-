import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get("upcoming");
  const overdue = searchParams.get("overdue");

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const schedules = await prisma.inspectionSchedule.findMany({
    where: {
      completed: false,
      ...(upcoming === "true" && {
        scheduledAt: { lte: thirtyDaysLater },
      }),
      ...(overdue === "true" && {
        scheduledAt: { lt: now },
      }),
    },
    include: {
      device: { select: { name: true, deviceCode: true, location: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const schedule = await prisma.inspectionSchedule.create({
    data: {
      deviceId: body.deviceId,
      scheduledAt: new Date(body.scheduledAt),
      intervalDays: body.intervalDays,
      description: body.description,
      items: body.items?.length
        ? {
            create: body.items.map((item: { name: string; lowerLimit?: number; upperLimit?: number }) => ({
              name: item.name,
              lowerLimit: item.lowerLimit ?? null,
              upperLimit: item.upperLimit ?? null,
            })),
          }
        : undefined,
    },
    include: {
      device: { select: { name: true, deviceCode: true } },
      items: true,
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}
