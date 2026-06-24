import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const checks = await prisma.sterilizationCheck.findMany({
    include: {
      device: { select: { name: true, deviceCode: true, cleanFieldCategory: true } },
    },
    orderBy: { inspectedAt: "desc" },
    take: 200,
  });

  return NextResponse.json(checks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { deviceId, inspectedBy, judgment, notes, inspectedAt } = body;

  if (!deviceId || !inspectedBy || !judgment) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const check = await prisma.sterilizationCheck.create({
    data: {
      deviceId,
      inspectedBy,
      judgment,
      notes: notes || null,
      inspectedAt: inspectedAt ? new Date(inspectedAt) : new Date(),
    },
    include: {
      device: { select: { name: true, deviceCode: true, cleanFieldCategory: true } },
    },
  });

  return NextResponse.json(check, { status: 201 });
}
