import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const device = await prisma.device.findUnique({
    where: { id },
    include: {
      maintenanceLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { performedAt: "desc" },
      },
      repairLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { reportedAt: "desc" },
      },
      inspectionSchedules: {
        orderBy: { scheduledAt: "asc" },
      },
    },
  });

  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(device);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const device = await prisma.device.update({
    where: { id },
    data: {
      deviceCode: body.deviceCode,
      name: body.name,
      category: body.category,
      manufacturer: body.manufacturer,
      model: body.model,
      serialNumber: body.serialNumber || null,
      location: body.location,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
      status: body.status,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(device);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!session || user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.device.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
