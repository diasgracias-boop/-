import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findSharedAttachments } from "@/lib/deviceAttachmentSync";

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

  // 同型式・同メーカーの既存機器から添付URLを継承（フォームで未入力の場合）
  let attachmentUrl = body.attachmentUrl || null;
  let catalogUrl = body.catalogUrl || null;
  let manualUrl = body.manualUrl || null;
  let pmdaApprovalNumber = body.pmdaApprovalNumber || null;
  let pmdaDocUpdatedAt = body.pmdaDocUpdatedAt || null;

  if (!attachmentUrl && !catalogUrl && !manualUrl) {
    const peer = await findSharedAttachments(body.model, body.manufacturer);
    if (peer) {
      attachmentUrl = peer.attachmentUrl;
      catalogUrl = peer.catalogUrl;
      manualUrl = peer.manualUrl;
      pmdaApprovalNumber = pmdaApprovalNumber || peer.pmdaApprovalNumber;
      pmdaDocUpdatedAt = pmdaDocUpdatedAt || peer.pmdaDocUpdatedAt;
    }
  }

  const incomingItems: { name: string; category?: string; lowerLimit?: number | null; upperLimit?: number | null }[] = body.inspectionItems ?? [];

  const device = await prisma.device.create({
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
      status: body.status || "ACTIVE",
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
      cleanFieldDefaultCount: body.cleanFieldDefaultCount !== "" && body.cleanFieldDefaultCount != null ? parseInt(body.cleanFieldDefaultCount) : null,
      cleanFieldCurrentCount: body.cleanFieldCurrentCount !== "" && body.cleanFieldCurrentCount != null ? parseInt(body.cleanFieldCurrentCount) : null,
      cleanFieldSubstituteCount: body.cleanFieldSubstituteCount !== "" && body.cleanFieldSubstituteCount != null ? parseInt(body.cleanFieldSubstituteCount) : null,
      photoUrl: body.photoUrl || null,
      attachmentUrl,
      catalogUrl,
      manualUrl,
      pmdaApprovalNumber,
      pmdaDocUpdatedAt,
      pmdaLastCheckedAt: pmdaApprovalNumber ? new Date() : null,
      pmdaUpdateAvailable: false,
      inspectionItems: incomingItems.length > 0 ? {
        create: incomingItems.map((item, idx) => ({
          name: item.name,
          category: item.category ?? "外装・機能点検",
          lowerLimit: item.lowerLimit ?? null,
          upperLimit: item.upperLimit ?? null,
          sortOrder: idx,
        })),
      } : undefined,
    },
  });

  return NextResponse.json(device, { status: 201 });
}
