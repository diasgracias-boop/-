import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 点検スケジュールにテンプレートを適用し、点検項目を生成する。
// 併せて機器側の点検項目・最終選択テンプレートも更新し、以後の点検で再利用できるようにする。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const templateId: string | undefined = body.templateId;
  if (!templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });

  const schedule = await prisma.inspectionSchedule.findUnique({ where: { id } });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const template = await prisma.inspectionTemplate.findUnique({
    where: { id: templateId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  await prisma.inspectionItem.deleteMany({ where: { scheduleId: id } });
  const created = await prisma.$transaction(
    template.items.map((item) =>
      prisma.inspectionItem.create({
        data: {
          scheduleId: id,
          name: item.name,
          category: item.category,
          lowerLimit: item.lowerLimit,
          upperLimit: item.upperLimit,
        },
      })
    )
  );

  // 機器の点検項目・前回選択テンプレートとしても保存
  await prisma.deviceInspectionItem.deleteMany({ where: { deviceId: schedule.deviceId } });
  if (template.items.length > 0) {
    await prisma.deviceInspectionItem.createMany({
      data: template.items.map((item, idx) => ({
        deviceId: schedule.deviceId,
        name: item.name,
        category: item.category,
        lowerLimit: item.lowerLimit,
        upperLimit: item.upperLimit,
        sortOrder: idx,
      })),
    });
  }
  await prisma.device.update({
    where: { id: schedule.deviceId },
    data: { lastInspectionTemplateId: templateId },
  });

  return NextResponse.json(created);
}
