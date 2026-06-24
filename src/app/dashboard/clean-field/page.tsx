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

interface DeviceRow {
  baseName: string;
  defaultCount: number | null;
  currentCount: number | null;
  substituteCount: number | null;
}

const UNCATEGORIZED = "（未分類）";

function baseName(name: string): string {
  return name.replace(/[\s①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]+$/, "").trim();
}

function sumNullable(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

function groupDevices(devices: CleanFieldDevice[]): DeviceRow[] {
  const map = new Map<string, DeviceRow>();
  for (const d of devices) {
    const key = baseName(d.name);
    const ex = map.get(key);
    if (ex) {
      ex.defaultCount = sumNullable(ex.defaultCount, d.cleanFieldDefaultCount);
      ex.currentCount = sumNullable(ex.currentCount, d.cleanFieldCurrentCount);
      ex.substituteCount = sumNullable(ex.substituteCount, d.cleanFieldSubstituteCount);
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

  const allRows = groupDevices(devices);
  const totalShortage = allRows.filter(
    (r) => r.currentCount != null && r.defaultCount != null && r.currentCount < r.defaultCount
  ).length;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">清潔野機器一覧</h1>
        </div>
        <div className="flex items-center gap-2">
          {totalShortage > 0 && (
            <span className="bg-red-50 border border-red-200 rounded-md px-3 py-1 text-xs text-red-700 font-medium">
              不足 {totalShortage} 種
            </span>
          )}
          <span className="bg-teal-50 border border-teal-200 rounded-md px-3 py-1 text-xs text-teal-700 font-medium">
            計 {devices.length} 台
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">読み込み中...</div>
      ) : devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">清潔野機器として登録された機器はありません</p>
          <p className="text-gray-400 text-xs mt-1">機器情報の「廃棄・その他」タブで「清潔野機器」にチェックを入れてください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCats.map((cat) => {
            const rows = groupDevices(catMap[cat]);
            const catShortage = rows.filter(
              (r) => r.currentCount != null && r.defaultCount != null && r.currentCount < r.defaultCount
            ).length;

            return (
              <div key={cat} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Category header */}
                <div className="bg-teal-50 border-b border-teal-100 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                    <span className="text-xs font-semibold text-teal-800">{cat}</span>
                    <span className="text-xs text-teal-500">{catMap[cat].length} 台 / {rows.length} 種</span>
                  </div>
                  {catShortage > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                      不足 {catShortage} 種
                    </span>
                  )}
                </div>

                {/* Column labels */}
                <div className="grid grid-cols-5 border-b border-gray-100 bg-gray-50 px-2">
                  {rows.slice(0, 5).map((_, i) => i === 0 ? null : null)}
                  <div className="col-span-5 grid grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="px-2 py-1">
                        <div className="grid grid-cols-3 gap-0 text-center">
                          <span className="text-[10px] text-gray-400">既定</span>
                          <span className="text-[10px] text-gray-400">現在</span>
                          <span className="text-[10px] text-gray-400">代品</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Device cards grid */}
                <div className="grid grid-cols-5 divide-x divide-y divide-gray-100 p-0">
                  {rows.map((row) => {
                    const shortage =
                      row.currentCount != null &&
                      row.defaultCount != null &&
                      row.currentCount < row.defaultCount;
                    const diff =
                      shortage && row.defaultCount != null && row.currentCount != null
                        ? row.defaultCount - row.currentCount
                        : null;

                    return (
                      <div
                        key={row.baseName}
                        className={`px-2 py-1.5 ${shortage ? "bg-red-50" : ""}`}
                      >
                        <div className="text-xs font-medium text-gray-800 leading-tight mb-1 truncate" title={row.baseName}>
                          {shortage && <span className="inline-block w-1 h-1 bg-red-500 rounded-full mr-1 mb-0.5" />}
                          {row.baseName}
                        </div>
                        <div className="grid grid-cols-3 gap-0 text-center">
                          <span className="text-xs font-medium text-gray-500">
                            {row.defaultCount ?? "—"}
                          </span>
                          <span className={`text-xs font-bold ${shortage ? "text-red-600" : "text-gray-800"}`}>
                            {row.currentCount ?? "—"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {row.substituteCount ?? "—"}
                          </span>
                        </div>
                        {shortage && diff != null && (
                          <div className="text-center">
                            <span className="text-[10px] text-red-500">−{diff} 不足</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
