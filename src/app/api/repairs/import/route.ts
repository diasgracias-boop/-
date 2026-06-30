import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RepairStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

const STATUS_MAP: Record<string, RepairStatus> = {
  "未対応": "OPEN", "対応中": "IN_PROGRESS", "解決済": "RESOLVED", "完了": "CLOSED",
  OPEN: "OPEN", IN_PROGRESS: "IN_PROGRESS", RESOLVED: "RESOLVED", CLOSED: "CLOSED",
};

interface ImportItem {
  id: string;
  status?: string;
  changedBy?: string;
  note?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const items: ImportItem[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "取り込む行がありません" }, { status: 400 });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const item of items) {
    if (!item.id) { errors.push("修理IDが空の行をスキップしました"); continue; }
    const newStatus = item.status ? STATUS_MAP[item.status.trim()] : undefined;
    const note = item.note?.trim() || null;
    const changedBy = item.changedBy?.trim() || "代理店";

    // ステータスもコメントも無ければスキップ
    if (!newStatus && !note) continue;

    try {
      const existing = await prisma.repairLog.findUnique({ where: { id: item.id } });
      if (!existing) { errors.push(`修理ID ${item.id} が見つかりません`); continue; }

      const effectiveStatus = newStatus ?? (existing.status as RepairStatus);

      await prisma.repairLog.update({
        where: { id: item.id },
        data: {
          status: effectiveStatus,
          ...(effectiveStatus === "RESOLVED" || effectiveStatus === "CLOSED"
            ? { resolvedAt: existing.resolvedAt ?? new Date() }
            : {}),
          statusLogs: {
            create: {
              status: effectiveStatus,
              changedBy,
              note: note ?? "（代理店CSV取込）",
            },
          },
        },
      });

      if (effectiveStatus === "RESOLVED" || effectiveStatus === "CLOSED") {
        await prisma.device.update({ where: { id: existing.deviceId }, data: { status: "ACTIVE" } });
      }
      updated++;
    } catch {
      errors.push(`修理ID ${item.id} の取込に失敗しました`);
    }
  }

  return NextResponse.json({ updated, errors });
}
