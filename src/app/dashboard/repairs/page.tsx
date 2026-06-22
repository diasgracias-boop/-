"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import RepairModal from "@/components/RepairModal";
import RepairUpdateModal from "@/components/RepairUpdateModal";

interface RepairLog {
  id: string;
  reportedAt: string;
  symptom: string;
  cause?: string;
  action?: string;
  status: string;
  cost?: number;
  vendor?: string;
  reportedBy: string;
  resolvedAt?: string;
  device: { name: string; deviceCode: string };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: "未対応", color: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "対応中", color: "bg-yellow-100 text-yellow-700" },
  RESOLVED: { label: "解決済", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "完了", color: "bg-gray-100 text-gray-600" },
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ja-JP");
}

export default function RepairsPage() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<RepairLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [showModal, setShowModal] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<RepairLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/repairs?${params}`);
    const data = await res.json();
    setLogs(data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">修理・故障履歴</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          + 故障を報告
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { value: "", label: "すべて" },
          { value: "OPEN", label: "未対応" },
          { value: "IN_PROGRESS", label: "対応中" },
          { value: "RESOLVED", label: "解決済" },
          { value: "CLOSED", label: "完了" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">修理・故障履歴がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">機器名</th>
                <th className="px-4 py-3">症状</th>
                <th className="px-4 py-3">原因</th>
                <th className="px-4 py-3">対応内容</th>
                <th className="px-4 py-3">ステータス</th>
                <th className="px-4 py-3">報告者</th>
                <th className="px-4 py-3">報告日</th>
                <th className="px-4 py-3">解決日</th>
                <th className="px-4 py-3">費用</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const st = statusConfig[log.status] ?? { label: log.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div>{log.device.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{log.device.deviceCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="truncate">{log.symptom}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="truncate">{log.cause ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="truncate">{log.action ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.reportedBy}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(log.reportedAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(log.resolvedAt)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.cost != null ? `¥${log.cost.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {(log.status === "OPEN" || log.status === "IN_PROGRESS") && (
                        <button
                          onClick={() => setUpdateTarget(log)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          更新
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <RepairModal onClose={() => setShowModal(false)} onSaved={fetchLogs} />
      )}
      {updateTarget && (
        <RepairUpdateModal
          repair={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onSaved={fetchLogs}
        />
      )}
    </div>
  );
}
