import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.inspectionTemplate.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const template = await prisma.inspectionTemplate.create({
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
  return NextResponse.json(template, { status: 201 });
}
