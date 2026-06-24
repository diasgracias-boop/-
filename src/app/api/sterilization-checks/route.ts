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

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, inspectedBy, judgment, notes, inspectedAt } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const check = await prisma.sterilizationCheck.update({
    where: { id },
    data: {
      ...(inspectedBy !== undefined && { inspectedBy }),
      ...(judgment !== undefined && { judgment }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(inspectedAt !== undefined && { inspectedAt: new Date(inspectedAt) }),
    },
    include: { device: { select: { name: true, deviceCode: true, cleanFieldCategory: true } } },
  });
  return NextResponse.json(check);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.sterilizationCheck.delete({ where: { id } });
  return NextResponse.json({ ok: true });
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
