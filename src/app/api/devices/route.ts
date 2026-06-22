import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const devices = await prisma.device.findMany({
    where: {
      ...(status && { status: status as "ACTIVE" | "MAINTENANCE" | "REPAIR" | "RETIRED" }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { deviceCode: { contains: search, mode: "insensitive" } },
          { manufacturer: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      _count: {
        select: {
          maintenanceLogs: true,
          repairLogs: true,
          inspectionSchedules: true,
        },
      },
      inspectionSchedules: {
        where: { completed: false },
        orderBy: { scheduledAt: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(devices);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const device = await prisma.device.create({
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
      status: body.status || "ACTIVE",
      notes: body.notes || null,
    },
  });

  return NextResponse.json(device, { status: 201 });
}
