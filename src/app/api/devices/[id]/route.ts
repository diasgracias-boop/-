import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncAttachmentsToSameModel } from "@/lib/deviceAttachmentSync";

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
      inspectionItems: {
        orderBy: { sortOrder: "asc" },
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

  const attachmentUrl = body.attachmentUrl || null;
  const catalogUrl = body.catalogUrl || null;
  const manualUrl = body.manualUrl || null;
  const pmdaApprovalNumber = body.pmdaApprovalNumber || null;
  const pmdaDocUpdatedAt = body.pmdaDocUpdatedAt || null;

  // Upsert inspection items
  // 点検項目は点検スケジュール/テンプレート側で管理する。
  // body に inspectionItems が含まれる場合のみ更新し、未指定なら既存項目を保持する。
  if (body.inspectionItems !== undefined) {
    const incomingItems: { id?: string; name: string; category?: string; lowerLimit?: number | null; upperLimit?: number | null; sortOrder?: number }[] = body.inspectionItems ?? [];
    await prisma.deviceInspectionItem.deleteMany({ where: { deviceId: id } });
    if (incomingItems.length > 0) {
      await prisma.deviceInspectionItem.createMany({
        data: incomingItems.map((item, idx) => ({
          deviceId: id,
          name: item.name,
          category: item.category ?? "外装・機能点検",
          lowerLimit: item.lowerLimit ?? null,
          upperLimit: item.upperLimit ?? null,
          sortOrder: idx,
        })),
      });
    }
  }

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
      cleanFieldDefaultCount: body.cleanFieldDefaultCount !== "" && body.cleanFieldDefaultCount != null ? parseInt(body.cleanFieldDefaultCount) : null,
      cleanFieldCurrentCount: body.cleanFieldCurrentCount !== "" && body.cleanFieldCurrentCount != null ? parseInt(body.cleanFieldCurrentCount) : null,
      cleanFieldSubstituteCount: body.cleanFieldSubstituteCount !== "" && body.cleanFieldSubstituteCount != null ? parseInt(body.cleanFieldSubstituteCount) : null,
      photoUrl: body.photoUrl || null,
      attachmentUrl,
      catalogUrl,
      manualUrl,
      pmdaApprovalNumber,
      pmdaDocUpdatedAt,
      ...(pmdaApprovalNumber ? { pmdaLastCheckedAt: new Date(), pmdaUpdateAvailable: false } : {}),
      ...(body.lastInspectionTemplateId !== undefined ? { lastInspectionTemplateId: body.lastInspectionTemplateId || null } : {}),
    },
  });

  // 同型式+同メーカーの他の機器に添付URLを同期
  await syncAttachmentsToSameModel(device.model, device.manufacturer, device.id, {
    attachmentUrl,
    catalogUrl,
    manualUrl,
    pmdaApprovalNumber,
    pmdaDocUpdatedAt,
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
