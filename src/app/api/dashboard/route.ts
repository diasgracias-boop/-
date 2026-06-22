import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalDevices,
    activeDevices,
    repairDevices,
    overdueInspections,
    upcomingInspections,
    openRepairs,
    recentMaintenance,
    recentRepairs,
    pmdaUpdates,
  ] = await Promise.all([
    prisma.device.count(),
    prisma.device.count({ where: { status: "ACTIVE" } }),
    prisma.device.count({ where: { status: "REPAIR" } }),
    prisma.inspectionSchedule.count({
      where: { completed: false, scheduledAt: { lt: now } },
    }),
    prisma.inspectionSchedule.findMany({
      where: { completed: false, scheduledAt: { gte: now, lte: thirtyDaysLater } },
      include: { device: { select: { name: true, deviceCode: true, location: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.repairLog.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.maintenanceLog.findMany({
      orderBy: { performedAt: "desc" },
      take: 5,
      include: { device: { select: { name: true, deviceCode: true } } },
    }),
    prisma.repairLog.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { reportedAt: "desc" },
      take: 5,
      include: { device: { select: { name: true, deviceCode: true } } },
    }),
    prisma.device.findMany({
      where: { pmdaUpdateAvailable: true },
      select: { id: true, name: true, deviceCode: true, manufacturer: true, pmdaLastCheckedAt: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    stats: { totalDevices, activeDevices, repairDevices, overdueInspections, openRepairs, pmdaUpdatesCount: pmdaUpdates.length },
    upcomingInspections,
    recentMaintenance,
    recentRepairs,
    pmdaUpdates,
  });
}
