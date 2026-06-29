"use client";

export interface RepairStatusLogEntry {
  id: string;
  status: string;
  changedBy: string;
  note: string | null;
  changedAt: string;
}

const STATUS_ORDER = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string; line: string }> = {
  OPEN: { label: "未対応", badge: "bg-red-100 text-red-700", dot: "bg-red-500", line: "bg-red-300" },
  IN_PROGRESS: { label: "対応中", badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500", line: "bg-yellow-300" },
  RESOLVED: { label: "解決済", badge: "bg-green-100 text-green-700", dot: "bg-green-500", line: "bg-green-300" },
  CLOSED: { label: "完了", badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400", line: "bg-gray-300" },
};

function fmt(dt: string) {
  return new Date(dt).toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function RepairTimeline({ logs, currentStatus }: { logs: RepairStatusLogEntry[]; currentStatus: string }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus as typeof STATUS_ORDER[number]);
  // 新しい順（上が最新）
  const ordered = [...logs].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  return (
    <div className="space-y-4">
      {/* 進捗ステッパー */}
      <div className="flex items-center">
        {STATUS_ORDER.map((s, i) => {
          const cfg = STATUS_CONFIG[s];
          const reached = i <= currentIdx;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${reached ? cfg.dot : "bg-gray-200"}`}>
                  {reached ? "✓" : i + 1}
                </div>
                <span className={`mt-1 text-[10px] font-medium whitespace-nowrap ${reached ? "text-gray-700" : "text-gray-400"}`}>{cfg.label}</span>
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 -mt-4 ${i < currentIdx ? cfg.line : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* 対応タイムライン */}
      {ordered.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">対応履歴</p>
          <div className="relative">
            {ordered.map((log, i) => {
              const cfg = STATUS_CONFIG[log.status] ?? { label: log.status, badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400", line: "bg-gray-300" };
              const isLast = i === ordered.length - 1;
              return (
                <div key={log.id} className="flex gap-3 pb-3 last:pb-0">
                  {/* ドット＋縦線 */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${cfg.dot} ring-2 ring-white shrink-0 mt-1`} />
                    {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                  </div>
                  {/* 内容 */}
                  <div className="flex-1 -mt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                      <span className="text-xs font-medium text-gray-700">{log.changedBy}</span>
                      <span className="text-xs text-gray-400">{fmt(log.changedAt)}</span>
                    </div>
                    {log.note && <p className="text-xs text-gray-600 mt-1">{log.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
