"use client";

import { useEffect, useState } from "react";

interface CleanFieldDevice {
  id: string;
  deviceCode: string;
  name: string;
  category: string;
  cleanFieldCategory: string | null;
  manufacturer: string;
  model: string;
  location: string;
  department: string | null;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "稼働中",
  MAINTENANCE: "点検中",
  REPAIR: "修理中",
  RETIRED: "廃棄",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-700",
  REPAIR: "bg-red-100 text-red-700",
  RETIRED: "bg-gray-100 text-gray-500",
};

const UNCATEGORIZED = "（未分類）";

export default function CleanFieldPage() {
  const [devices, setDevices] = useState<CleanFieldDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/devices/clean-field")
      .then((r) => r.json())
      .then((data) => { setDevices(data); setLoading(false); });
  }, []);

  // Group by cleanFieldCategory
  const groups = devices.reduce<Record<string, CleanFieldDevice[]>>((acc, d) => {
    const key = d.cleanFieldCategory || UNCATEGORIZED;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b, "ja");
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">清潔野機器一覧</h1>
          <p className="text-sm text-gray-500 mt-1">清潔野機器として登録された機器をカテゴリ別に表示</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2 text-sm text-teal-700 font-medium">
          計 {devices.length} 台
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">読み込み中...</div>
      ) : devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">清潔野機器として登録された機器はありません</p>
          <p className="text-gray-400 text-xs mt-1">機器情報の「廃棄・その他」タブで「清潔野機器」にチェックを入れてください</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedKeys.map((cat) => (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-teal-50 border-b border-teal-100 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full" />
                  <h2 className="text-sm font-semibold text-teal-800">
                    {cat}
                  </h2>
                </div>
                <span className="text-xs text-teal-600 font-medium">{groups[cat].length} 台</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs text-gray-500 text-left">
                    <th className="px-4 py-2.5">管理番号</th>
                    <th className="px-4 py-2.5">機器名</th>
                    <th className="px-4 py-2.5">機器カテゴリ</th>
                    <th className="px-4 py-2.5">メーカー / 型式</th>
                    <th className="px-4 py-2.5">配備部署</th>
                    <th className="px-4 py-2.5">設置場所</th>
                    <th className="px-4 py-2.5">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {groups[cat].map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.deviceCode}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{d.category}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div>{d.manufacturer}</div>
                        <div className="text-gray-400">{d.model}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{d.department ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{d.location}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[d.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
