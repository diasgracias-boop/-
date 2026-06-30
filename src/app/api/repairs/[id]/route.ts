import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const log = await prisma.repairLog.update({
    where: { id },
    data: {
      cause: body.cause || null,
      action: body.action || null,
      status: body.status,
      resolvedAt: body.status === "RESOLVED" || body.status === "CLOSED" ? new Date() : null,
      cost: body.cost ? parseFloat(body.cost) : null,
      vendor: body.vendor || null,
      ...(body.dealerId !== undefined && { dealerId: body.dealerId || null }),
      statusLogs: {
        create: {
          status: body.status,
          changedBy: body.changedBy || "—",
          note: body.note || null,
        },
      },
    },
    include: {
      statusLogs: { orderBy: { changedAt: "asc" } },
    },
  });

  if (body.status === "RESOLVED" || body.status === "CLOSED") {
    await prisma.device.update({
      where: { id: log.deviceId },
      data: { status: "ACTIVE" },
    });
  }

  return NextResponse.json(log);
}
