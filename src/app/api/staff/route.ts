import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staff = await prisma.staff.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "氏名は必須です" }, { status: 400 });
  }

  const staff = await prisma.staff.create({
    data: {
      name: body.name,
      department: body.department || null,
      position: body.position || null,
      phone: body.phone || null,
      email: body.email || null,
    },
  });
  return NextResponse.json(staff, { status: 201 });
}
