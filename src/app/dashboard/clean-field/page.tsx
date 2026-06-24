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

function CategorySection({ cat, devices, defaultOpen }: { cat: string; devices: CleanFieldDevice[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const rows = groupDevices(devices);
  const shortageRows = rows.filter(r => r.currentCount != null && r.defaultCount != null && r.currentCount < r.defaultCount);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-teal-50 border-b border-teal-100 px-5 py-3 flex items-center justify-between hover:bg-teal-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-teal-500 transition-transform ${open ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="w-2 h-2 bg-teal-500 rounded-full" />
          <span className="text-sm font-semibold text-teal-800">{cat}</span>
          <span className="text-xs text-teal-500 font-normal">{devices.length} 台 / {rows.length} 種</span>
        </div>
        <div className="flex items-center gap-2">
          {shortageRows.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
              不足 {shortageRows.length} 種
            </span>
          )}
        </div>
      </button>

      {open && (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-2 text-left">機器名</th>
              <th className="px-4 py-2 text-center w-24">既定定数</th>
              <th className="px-4 py-2 text-center w-24">現在定数</th>
              <th className="px-4 py-2 text-center w-24">代品数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => {
              const shortage = row.currentCount != null && row.defaultCount != null && row.currentCount < row.defaultCount;
              const diff = shortage && row.defaultCount != null && row.currentCount != null
                ? row.defaultCount - row.currentCount
                : null;
              return (
                <tr key={row.baseName} className={`transition-colors ${shortage ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {shortage && (
                        <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                      )}
                      {row.baseName}
                      {shortage && diff != null && (
                        <span className="text-xs text-red-500 font-normal">（{diff} 不足）</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-sm font-medium text-gray-600">{row.defaultCount ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-sm font-bold ${shortage ? "text-red-600" : "text-gray-800"}`}>
                      {row.currentCount ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-sm text-gray-600">{row.substituteCount ?? "—"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function CleanFieldPage() {
  const [devices, setDevices] = useState<CleanFieldDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [allOpen, setAllOpen] = useState(true);

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

  // Global shortage summary
  const allRows = devices.length > 0 ? groupDevices(devices) : [];
  const totalShortage = allRows.filter(r => r.currentCount != null && r.defaultCount != null && r.currentCount < r.defaultCount).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">清潔野機器一覧</h1>
          <p className="text-sm text-gray-500 mt-0.5">清潔野機器として登録された機器をカテゴリ別に表示</p>
        </div>
        <div className="flex items-center gap-3">
          {totalShortage > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 font-medium">
              不足 {totalShortage} 種
            </div>
          )}
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2 text-sm text-teal-700 font-medium">
            計 {devices.length} 台
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {!loading && devices.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setAllOpen(true)}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            すべて展開
          </button>
          <button
            onClick={() => setAllOpen(false)}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            すべて折りたたむ
          </button>
        </div>
      )}

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
        <div className="space-y-3">
          {sortedCats.map((cat) => (
            <CategorySection key={`${cat}-${allOpen}`} cat={cat} devices={catMap[cat]} defaultOpen={allOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
