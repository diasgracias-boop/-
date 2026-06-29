import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("deviceId");
  const status = searchParams.get("status");

  const logs = await prisma.repairLog.findMany({
    where: {
      ...(deviceId && { deviceId }),
      ...(status && { status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" }),
    },
    include: {
      device: { select: { name: true, deviceCode: true } },
      user: { select: { name: true } },
      statusLogs: { orderBy: { changedAt: "asc" } },
    },
    orderBy: { reportedAt: "desc" },
  });

  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const userId = (session.user as { id?: string }).id;

  const log = await prisma.repairLog.create({
    data: {
      deviceId: body.deviceId,
      reportedBy: body.reportedBy,
      userId,
      reportedAt: new Date(body.reportedAt),
      symptom: body.symptom,
      cause: body.cause || null,
      action: body.action || null,
      status: body.status || "OPEN",
      cost: body.cost ? parseFloat(body.cost) : null,
      vendor: body.vendor || null,
      statusLogs: {
        create: {
          status: body.status || "OPEN",
          changedBy: body.reportedBy,
          note: body.symptom,
          changedAt: new Date(body.reportedAt),
        },
      },
    },
    include: {
      device: { select: { name: true, deviceCode: true } },
      statusLogs: { orderBy: { changedAt: "asc" } },
    },
  });

  await prisma.device.update({
    where: { id: body.deviceId },
    data: { status: "REPAIR" },
  });

  return NextResponse.json(log, { status: 201 });
}
