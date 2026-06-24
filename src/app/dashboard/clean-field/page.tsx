"use client";

import { useEffect, useState } from "react";

interface CleanFieldDevice {
  id: string;
  name: string;
  cleanFieldCategory: string | null;
  cleanFieldDefaultCount: number | null;
  cleanFieldCurrentCount: number | null;
  cleanFieldSubstituteCount: number | null;
}

interface DeviceGroup {
  baseName: string;
  defaultCount: number | null;
  currentCount: number | null;
  substituteCount: number | null;
}

const UNCATEGORIZED = "（未分類）";

// Strip trailing circled numbers ①②③... and whitespace
function baseName(name: string): string {
  return name.replace(/[\s①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]+$/, "").trim();
}

function sumNullable(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

function groupDevices(devices: CleanFieldDevice[]): DeviceGroup[] {
  const map = new Map<string, DeviceGroup>();
  for (const d of devices) {
    const key = baseName(d.name);
    const existing = map.get(key);
    if (existing) {
      existing.defaultCount = sumNullable(existing.defaultCount, d.cleanFieldDefaultCount);
      existing.currentCount = sumNullable(existing.currentCount, d.cleanFieldCurrentCount);
      existing.substituteCount = sumNullable(existing.substituteCount, d.cleanFieldSubstituteCount);
    } else {
      map.set(key, {
        baseName: key,
        defaultCount: d.cleanFieldDefaultCount,
        currentCount: d.cleanFieldCurrentCount,
        substituteCount: d.cleanFieldSubstituteCount,
      });
    }
  }
  return Array.from(map.values());
}

export default function CleanFieldPage() {
  const [devices, setDevices] = useState<CleanFieldDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/devices/clean-field")
      .then((r) => r.json())
      .then((data) => { setDevices(data); setLoading(false); });
  }, []);

  // Group by cleanFieldCategory, then by baseName within each category
  const catMap = devices.reduce<Record<string, CleanFieldDevice[]>>((acc, d) => {
    const key = d.cleanFieldCategory || UNCATEGORIZED;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const sortedCats = Object.keys(catMap).sort((a, b) => {
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
          {sortedCats.map((cat) => {
            const rows = groupDevices(catMap[cat]);
            return (
              <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-teal-50 border-b border-teal-100 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full" />
                    <h2 className="text-sm font-semibold text-teal-800">{cat}</h2>
                  </div>
                  <span className="text-xs text-teal-600 font-medium">{catMap[cat].length} 台</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-xs text-gray-500 text-left">
                      <th className="px-4 py-2.5">機器名</th>
                      <th className="px-4 py-2.5 text-center">既定定数</th>
                      <th className="px-4 py-2.5 text-center">現在定数</th>
                      <th className="px-4 py-2.5 text-center">代品数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row) => {
                      const shortage = row.currentCount != null && row.defaultCount != null && row.currentCount < row.defaultCount;
                      return (
                        <tr key={row.baseName} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.baseName}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-gray-700">{row.defaultCount ?? "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-medium ${shortage ? "text-red-600" : "text-gray-700"}`}>
                              {row.currentCount ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-gray-600">{row.substituteCount ?? "—"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
