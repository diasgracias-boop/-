import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "代理店名は必須です" }, { status: 400 });
  }

  const dealer = await prisma.dealer.update({
    where: { id },
    data: {
      name: body.name,
      contactPerson: body.contactPerson || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      landline: body.landline || null,
      mobile: body.mobile || null,
      fax: body.fax || null,
      tollFree: body.tollFree || null,
    },
  });
  return NextResponse.json(dealer);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.dealer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
