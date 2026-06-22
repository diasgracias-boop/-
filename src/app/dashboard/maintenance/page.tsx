"use client";

import { useEffect, useState, useCallback } from "react";
import MaintenanceModal from "@/components/MaintenanceModal";

interface MaintenanceLog {
  id: string;
  performedAt: string;
  type: string;
  description: string;
  result?: string;
  performedBy: string;
  nextSchedule?: string;
  device: { name: string; deviceCode: string };
  user?: { name: string };
}

const typeLabels: Record<string, { label: string; color: string }> = {
  INSPECTION: { label: "点検", color: "bg-blue-100 text-blue-700" },
  CALIBRATION: { label: "校正", color: "bg-purple-100 text-purple-700" },
  CLEANING: { label: "清掃", color: "bg-teal-100 text-teal-700" },
  PREVENTIVE: { label: "予防保守", color: "bg-yellow-100 text-yellow-700" },
  OTHER: { label: "その他", color: "bg-gray-100 text-gray-600" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ja-JP");
}

export default function MaintenancePage() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/maintenance");
    const data = await res.json();
    setLogs(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">保守履歴</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 保守記録を追加
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">保守履歴がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">機器名</th>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">実施内容</th>
                <th className="px-4 py-3">結果</th>
                <th className="px-4 py-3">実施者</th>
                <th className="px-4 py-3">実施日</th>
                <th className="px-4 py-3">次回予定</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const type = typeLabels[log.type] ?? { label: log.type, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div>{log.device.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{log.device.deviceCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${type.color}`}>
                        {type.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="truncate">{log.description}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="truncate">{log.result ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.performedBy}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(log.performedAt)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.nextSchedule ? formatDate(log.nextSchedule) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <MaintenanceModal onClose={() => setShowModal(false)} onSaved={fetchLogs} />
      )}
    </div>
  );
}
