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
      ref: body.ref || null,
      dealer: body.dealer || null,
      department: body.department || null,
      serialNumber: body.serialNumber || null,
      location: body.location,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      usefulLifeYears: body.usefulLifeYears ? Number(body.usefulLifeYears) : null,
      price: body.price ? Number(body.price) : null,
      endOfSaleDate: body.endOfSaleDate ? new Date(body.endOfSaleDate) : null,
      endOfServiceDate: body.endOfServiceDate ? new Date(body.endOfServiceDate) : null,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
      status: body.status,
      disposalStatus: body.disposalStatus || null,
      disposalDate: body.disposalDate ? new Date(body.disposalDate) : null,
      inactiveDate: body.inactiveDate ? new Date(body.inactiveDate) : null,
      notes: body.notes || null,
      inspectionNotes: body.inspectionNotes || null,
      inspectionIntervalMonths: body.inspectionIntervalMonths ? Number(body.inspectionIntervalMonths) : null,
      batteryReplacementIntervalYears: body.batteryReplacementIntervalYears ? Number(body.batteryReplacementIntervalYears) : null,
      lastBatteryReplacementDate: body.lastBatteryReplacementDate ? new Date(body.lastBatteryReplacementDate) : null,
      consumableName: body.consumableName || null,
      lastConsumableReplacementDate: body.lastConsumableReplacementDate ? new Date(body.lastConsumableReplacementDate) : null,
      lastConsumableSpareReplacementDate: body.lastConsumableSpareReplacementDate ? new Date(body.lastConsumableSpareReplacementDate) : null,
      isCleanField: body.isCleanField ?? false,
      cleanFieldCategory: body.cleanFieldCategory || null,
      photoUrl: body.photoUrl || null,
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
