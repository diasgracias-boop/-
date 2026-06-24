import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const devices = await prisma.device.findMany({
    where: { isCleanField: true, status: { not: "RETIRED" } },
    select: {
      id: true,
      deviceCode: true,
      name: true,
      category: true,
      cleanFieldCategory: true,
      cleanFieldDefaultCount: true,
      cleanFieldCurrentCount: true,
      cleanFieldSubstituteCount: true,
      manufacturer: true,
      model: true,
      location: true,
      department: true,
      status: true,
    },
    orderBy: [{ cleanFieldCategory: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(devices);
}
