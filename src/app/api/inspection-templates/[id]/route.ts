import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  await prisma.inspectionTemplateItem.deleteMany({ where: { templateId: id } });

  const template = await prisma.inspectionTemplate.update({
    where: { id },
    data: {
      name: body.name,
      items: {
        create: (body.items ?? []).map((item: { name: string; category?: string; lowerLimit?: number; upperLimit?: number }, idx: number) => ({
          name: item.name,
          category: item.category ?? "外装・機能点検",
          lowerLimit: item.lowerLimit ?? null,
          upperLimit: item.upperLimit ?? null,
          sortOrder: idx,
        })),
      },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.inspectionTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
