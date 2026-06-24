"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import InspectionModal from "@/components/InspectionModal";
import InspectionCompleteModal from "@/components/InspectionCompleteModal";
import BulkInspectionModal from "@/components/BulkInspectionModal";

interface InspectionItem {
  id: string;
  name: string;
  category?: string;
  lowerLimit: number | null;
  upperLimit: number | null;
}

interface Schedule {
  id: string;
  deviceId: string;
  scheduledAt: string;
  intervalDays: number;
  description: string;
  completed: boolean;
  device: { name: string; deviceCode: string; location: string; department: string | null; category: string };
  items: InspectionItem[];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ja-JP");
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function InspectionsPage() {
  const searchParams = useSearchParams();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get("overdue") === "true" ? "overdue" : "upcoming");
  const [showModal, setShowModal] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Schedule | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "upcoming") params.set("upcoming", "true");
    if (filter === "overdue") params.set("overdue", "true");
    const res = await fetch(`/api/inspections?${params}`);
    const data = await res.json();
    setSchedules(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  function handleCompleteClick(schedule: Schedule) {
    setCompleteTarget(schedule);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">点検スケジュール</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            一括入力
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 点検予定を追加
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { value: "upcoming", label: "30日以内" },
          { value: "overdue", label: "期限超過" },
          { value: "all", label: "すべて" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
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
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-400">該当する点検予定がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">機器名</th>
                <th className="px-4 py-3">設置場所</th>
                <th className="px-4 py-3">点検内容</th>
                <th className="px-4 py-3">点検項目数</th>
                <th className="px-4 py-3">予定日</th>
                <th className="px-4 py-3">残り日数</th>
                <th className="px-4 py-3">周期（日）</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((s) => {
                const days = daysUntil(s.scheduledAt);
                const isOverdue = days < 0;
                const isUrgent = days >= 0 && days <= 7;
                return (
                  <tr key={s.id} className={`hover:bg-gray-50 ${isOverdue ? "bg-red-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div>{s.device.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{s.device.deviceCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.device.location}</td>
                    <td className="px-4 py-3 text-gray-600">{s.description}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.items.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {s.items.length}項目
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(s.scheduledAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-medium ${
                          isOverdue
                            ? "text-red-600"
                            : isUrgent
                            ? "text-orange-600"
                            : "text-gray-600"
                        }`}
                      >
                        {isOverdue ? `${Math.abs(days)}日超過` : `${days}日後`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.intervalDays}日</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleCompleteClick(s)}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 transition-colors"
                      >
                        完了
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <InspectionModal
          onClose={() => setShowModal(false)}
          onSaved={fetchSchedules}
        />
      )}

      {showBulkModal && (
        <BulkInspectionModal
          schedules={schedules}
          onClose={() => setShowBulkModal(false)}
          onCompleted={fetchSchedules}
        />
      )}

      {completeTarget && (
        <InspectionCompleteModal
          scheduleId={completeTarget.id}
          deviceId={completeTarget.deviceId}
          description={completeTarget.description}
          items={completeTarget.items}
          onClose={() => setCompleteTarget(null)}
          onCompleted={fetchSchedules}
        />
      )}
    </div>
  );
}
