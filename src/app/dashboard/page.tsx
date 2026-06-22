"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalDevices: number;
    activeDevices: number;
    repairDevices: number;
    overdueInspections: number;
    openRepairs: number;
    pmdaUpdatesCount: number;
  };
  upcomingInspections: Array<{
    id: string;
    scheduledAt: string;
    description: string;
    device: { name: string; deviceCode: string; location: string };
  }>;
  recentMaintenance: Array<{
    id: string;
    performedAt: string;
    type: string;
    description: string;
    device: { name: string; deviceCode: string };
  }>;
  recentRepairs: Array<{
    id: string;
    reportedAt: string;
    symptom: string;
    status: string;
    device: { name: string; deviceCode: string };
  }>;
  pmdaUpdates: Array<{
    id: string;
    name: string;
    deviceCode: string;
    manufacturer: string;
    pmdaLastCheckedAt: string | null;
  }>;
}

const typeLabels: Record<string, string> = {
  INSPECTION: "点検",
  CALIBRATION: "校正",
  CLEANING: "清掃",
  PREVENTIVE: "予防保守",
  OTHER: "その他",
};

const repairStatusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "未対応", color: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "対応中", color: "bg-yellow-100 text-yellow-700" },
  RESOLVED: { label: "解決済", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "完了", color: "bg-gray-100 text-gray-700" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const PMDA_CHECK_KEY = "pmdaLastCheckedAt";
const PMDA_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ checkedCount: number; updatedCount: number } | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  async function fetchDashboard() {
    const r = await fetch("/api/dashboard");
    setData(await r.json());
    setLoading(false);
  }

  async function runPmdaCheck() {
    setChecking(true);
    setCheckResult(null);
    try {
      const r = await fetch("/api/pmda/check-updates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const result = await r.json();
      const now = new Date();
      localStorage.setItem(PMDA_CHECK_KEY, now.toISOString());
      setLastCheckedAt(now);
      setCheckResult(result);
      await fetchDashboard();
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    fetchDashboard().then(() => {
      const stored = localStorage.getItem(PMDA_CHECK_KEY);
      const last = stored ? new Date(stored) : null;
      setLastCheckedAt(last);
      const shouldCheck = !last || (Date.now() - last.getTime() > PMDA_CHECK_INTERVAL_MS);
      if (shouldCheck) runPmdaCheck();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCheckPmda() {
    runPmdaCheck();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!data) return null;

  const { stats } = data;

  const statCards = [
    { label: "総機器数", value: stats.totalDevices, color: "bg-blue-600", href: "/dashboard/devices" },
    { label: "稼働中", value: stats.activeDevices, color: "bg-green-600", href: "/dashboard/devices?status=ACTIVE" },
    { label: "修理中", value: stats.repairDevices, color: "bg-orange-500", href: "/dashboard/devices?status=REPAIR" },
    { label: "点検期限超過", value: stats.overdueInspections, color: "bg-red-600", href: "/dashboard/inspections?overdue=true" },
    { label: "未対応修理", value: stats.openRepairs, color: "bg-yellow-500", href: "/dashboard/repairs?status=OPEN" },
    { label: "添付文書更新", value: stats.pmdaUpdatesCount, color: "bg-purple-600", href: "#pmda-updates" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.value > 0 && card.color.includes("red") ? "text-red-600" : "text-gray-900"}`}>
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">30日以内の点検予定</h2>
            <Link href="/dashboard/inspections" className="text-sm text-blue-600 hover:underline">
              すべて表示
            </Link>
          </div>
          {data.upcomingInspections.length === 0 ? (
            <p className="text-sm text-gray-400">予定なし</p>
          ) : (
            <ul className="space-y-3">
              {data.upcomingInspections.map((s) => (
                <li key={s.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.device.name} <span className="text-gray-400 text-xs">({s.device.deviceCode})</span>
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(s.scheduledAt)} · {s.device.location}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{s.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">未対応の修理・故障</h2>
            <Link href="/dashboard/repairs" className="text-sm text-blue-600 hover:underline">
              すべて表示
            </Link>
          </div>
          {data.recentRepairs.length === 0 ? (
            <p className="text-sm text-gray-400">未対応の修理はありません</p>
          ) : (
            <ul className="space-y-3">
              {data.recentRepairs.map((r) => {
                const status = repairStatusLabels[r.status];
                return (
                  <li key={r.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {r.device.name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(r.reportedAt)}</p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{r.symptom}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div id="pmda-updates" className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">添付文書 更新チェック</h2>
            <button
              onClick={handleCheckPmda}
              disabled={checking}
              className="flex items-center gap-1.5 text-sm bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors"
            >
              {checking && (
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {checking ? "確認中..." : "今すぐ確認"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {lastCheckedAt
              ? `最終確認: ${lastCheckedAt.toLocaleString("ja-JP")}（24時間ごとに自動確認）`
              : "PMDAに登録された添付文書に更新がないか確認します"}
          </p>
          {checkResult && (
            <div className="mb-4 bg-purple-50 border border-purple-200 text-purple-800 text-sm rounded-lg px-4 py-2">
              {checkResult.checkedCount}件を確認しました。{checkResult.updatedCount > 0 ? `${checkResult.updatedCount}件に更新があります。` : "更新はありません。"}
            </div>
          )}
          {data.pmdaUpdates.length === 0 ? (
            <p className="text-sm text-gray-400">更新が必要な添付文書はありません</p>
          ) : (
            <ul className="space-y-2">
              {data.pmdaUpdates.map((d) => (
                <li key={d.id} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0" />
                  <span className="font-medium text-gray-900">{d.name}</span>
                  <span className="text-gray-400 text-xs">({d.deviceCode})</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-auto">更新あり</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">最近の保守作業</h2>
            <Link href="/dashboard/maintenance" className="text-sm text-blue-600 hover:underline">
              すべて表示
            </Link>
          </div>
          {data.recentMaintenance.length === 0 ? (
            <p className="text-sm text-gray-400">保守履歴がありません</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4">機器名</th>
                  <th className="pb-2 pr-4">種別</th>
                  <th className="pb-2 pr-4">内容</th>
                  <th className="pb-2">実施日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentMaintenance.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {m.device.name}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {typeLabels[m.type] ?? m.type}
                    </td>
                    <td className="py-2 pr-4 text-gray-600 max-w-xs truncate">
                      {m.description}
                    </td>
                    <td className="py-2 text-gray-500">{formatDate(m.performedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
