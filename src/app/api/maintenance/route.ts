import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("deviceId");

  const logs = await prisma.maintenanceLog.findMany({
    where: { ...(deviceId && { deviceId }) },
    include: {
      device: { select: { name: true, deviceCode: true } },
      user: { select: { name: true } },
    },
    orderBy: { performedAt: "desc" },
  });

  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const userId = (session.user as { id?: string }).id;

  const log = await prisma.maintenanceLog.create({
    data: {
      deviceId: body.deviceId,
      performedBy: body.performedBy,
      userId,
      performedAt: new Date(body.performedAt),
      type: body.type,
      description: body.description,
      result: body.result || null,
      nextSchedule: body.nextSchedule ? new Date(body.nextSchedule) : null,
    },
    include: {
      device: { select: { name: true, deviceCode: true } },
    },
  });

  if (body.nextSchedule) {
    await prisma.inspectionSchedule.create({
      data: {
        deviceId: body.deviceId,
        scheduledAt: new Date(body.nextSchedule),
        intervalDays: body.intervalDays || 365,
        description: `点検予定: ${body.description}`,
      },
    });
  }

  return NextResponse.json(log, { status: 201 });
}
