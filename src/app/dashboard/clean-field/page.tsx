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

function CategoryCard({ cat, devices }: { cat: string; devices: CleanFieldDevice[] }) {
  const [open, setOpen] = useState(true);
  const rows = groupDevices(devices);
  const shortageCount = rows.filter(
    (r) => r.currentCount != null && r.defaultCount != null && r.currentCount < r.defaultCount
  ).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-teal-50 px-3 py-2 flex items-center justify-between hover:bg-teal-100 transition-colors text-left"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <svg
            className={`w-3 h-3 text-teal-500 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-semibold text-teal-800 truncate">{cat}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {shortageCount > 0 && (
            <span className="text-[10px] bg-red-100 text-red-600 font-medium px-1.5 py-0.5 rounded-full">
              不足{shortageCount}
            </span>
          )}
          <span className="text-[10px] text-teal-500">{rows.length}種</span>
        </div>
      </button>

      {/* Body */}
      {open && (
        <>
          {/* Column labels */}
          <div className="grid grid-cols-4 text-[10px] text-gray-400 text-center border-b border-gray-100 bg-gray-50 px-2 py-1">
            <span className="text-left col-span-1">機器名</span>
            <span>既定</span>
            <span>現在</span>
            <span>代品</span>
          </div>
          <div className="divide-y divide-gray-50">
            {rows.map((row) => {
              const shortage =
                row.currentCount != null &&
                row.defaultCount != null &&
                row.currentCount < row.defaultCount;
              return (
                <div
                  key={row.baseName}
                  className={`grid grid-cols-4 items-center px-2 py-1 text-xs gap-1 ${shortage ? "bg-red-50" : ""}`}
                >
                  <div className="truncate font-medium text-gray-800 flex items-center gap-1" title={row.baseName}>
                    {shortage && <span className="inline-block w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />}
                    <span className="truncate">{row.baseName}</span>
                  </div>
                  <div className="text-center text-gray-500">{row.defaultCount ?? "—"}</div>
                  <div className={`text-center font-bold ${shortage ? "text-red-600" : "text-gray-800"}`}>
                    {row.currentCount ?? "—"}
                  </div>
                  <div className="text-center text-gray-500">{row.substituteCount ?? "—"}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
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
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-gray-900">清潔野機器一覧</h1>
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
        <div className="grid grid-cols-5 gap-3 items-start">
          {sortedCats.map((cat) => (
            <CategoryCard key={cat} cat={cat} devices={catMap[cat]} />
          ))}
        </div>
      )}
    </div>
  );
}
