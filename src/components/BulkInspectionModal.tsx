"use client";

import { useEffect, useRef, useState } from "react";

const INSP_CATS = ["外装・機能点検", "性能点検", "電気的安全性点検"] as const;

interface InspItem {
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
  items: InspItem[];
}

// itemId → { measuredValue, judgment }
type MeasMap = Record<string, { measuredValue: string; judgment: string }>;

interface ColEntry {
  schedule: Schedule;
  completedAt: string;
  completedBy: string;
  measurements: MeasMap;
  loading: boolean;
}

interface Props {
  schedules: Schedule[];
  onClose: () => void;
  onCompleted: () => void;
}

// Unique item rows: built from union of all selected schedules' items, ordered by category then first-seen
interface ItemRow {
  key: string; // `${category}::${name}`
  name: string;
  category: string;
}

function autoJudge(v: string, lower: number | null, upper: number | null) {
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  if (lower !== null && n < lower) return "NG";
  if (upper !== null && n > upper) return "NG";
  return "OK";
}

const today = new Date().toISOString().split("T")[0];

// Build the ordered list of unique item rows from all selected col entries
function buildItemRows(cols: ColEntry[]): ItemRow[] {
  const seen = new Set<string>();
  const rows: ItemRow[] = [];
  // Iterate by canonical category order so rows come out grouped
  for (const cat of INSP_CATS) {
    for (const col of cols) {
      for (const item of col.schedule.items) {
        const itemCat = item.category ?? "";
        if (itemCat !== cat) continue;
        const key = `${cat}::${item.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ key, name: item.name, category: cat });
      }
    }
  }
  // Items with unknown category appended last
  for (const col of cols) {
    for (const item of col.schedule.items) {
      const cat = item.category ?? "";
      if ((INSP_CATS as readonly string[]).includes(cat)) continue;
      const key = `${cat}::${item.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ key, name: item.name, category: cat });
    }
  }
  return rows;
}

export default function BulkInspectionModal({ schedules: initialSchedules, onClose, onCompleted }: Props) {
  const [step, setStep] = useState<"select" | "input">("select");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSchedules.map((s) => s.id)));
  const [searchName, setSearchName] = useState("");
  const [searchDept, setSearchDept] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  // cols only populated once we enter input step
  const [cols, setCols] = useState<ColEntry[]>([]);
  const [commonDate, setCommonDate] = useState(today);
  const [commonBy, setCommonBy] = useState("");
  const [saving, setSaving] = useState(false);
  const populatedRef = useRef(false);

  // unique option values derived from all schedules
  const deptOptions = Array.from(new Set(initialSchedules.map((s) => s.device.department).filter(Boolean))) as string[];
  const locationOptions = Array.from(new Set(initialSchedules.map((s) => s.device.location).filter(Boolean)));
  const categoryOptions = Array.from(new Set(initialSchedules.map((s) => s.device.category).filter(Boolean)));

  const filteredSchedules = initialSchedules.filter((s) => {
    if (searchName && !s.device.name.includes(searchName) && !s.device.deviceCode.includes(searchName)) return false;
    if (searchDept && s.device.department !== searchDept) return false;
    if (searchLocation && s.device.location !== searchLocation) return false;
    if (searchCategory && s.device.category !== searchCategory) return false;
    return true;
  });

  const isFiltered = searchName || searchDept || searchLocation || searchCategory;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    // toggle all currently filtered schedules
    const filteredIds = filteredSchedules.map((s) => s.id);
    const allFilteredSelected = filteredIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  }

  // When moving to input step, initialize cols
  function goToInput() {
    const selectedSchedules = initialSchedules.filter((s) => selected.has(s.id));
    setCols(
      selectedSchedules.map((s) => ({
        schedule: s,
        completedAt: today,
        completedBy: "",
        measurements: Object.fromEntries(s.items.map((it) => [it.id, { measuredValue: "", judgment: "" }])),
        loading: s.items.length === 0,
      }))
    );
    setStep("input");
  }

  // populate-items for schedules with no items
  useEffect(() => {
    if (step !== "input" || populatedRef.current) return;
    populatedRef.current = true;
    cols.forEach((col, idx) => {
      if (!col.loading) return;
      fetch(`/api/inspections/${col.schedule.id}/populate-items`, { method: "POST" })
        .then((r) => r.json())
        .then((items: InspItem[]) => {
          setCols((prev) => prev.map((c, i) =>
            i !== idx ? c : {
              ...c,
              schedule: { ...c.schedule, items },
              measurements: Object.fromEntries(items.map((it) => [it.id, { measuredValue: "", judgment: "" }])),
              loading: false,
            }
          ));
        });
    });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyCommon() {
    setCols((prev) => prev.map((c) => ({
      ...c,
      completedAt: commonDate || c.completedAt,
      completedBy: commonBy || c.completedBy,
    })));
  }

  function updateColField(colIdx: number, field: "completedAt" | "completedBy", value: string) {
    setCols((prev) => prev.map((c, i) => i === colIdx ? { ...c, [field]: value } : c));
  }

  function updateMeasurement(colIdx: number, itemId: string, field: "measuredValue" | "judgment", value: string) {
    setCols((prev) => prev.map((c, i) => {
      if (i !== colIdx) return c;
      const prev_m = c.measurements[itemId] ?? { measuredValue: "", judgment: "" };
      const updated = { ...prev_m, [field]: value };
      if (field === "measuredValue") {
        const item = c.schedule.items.find((it) => it.id === itemId);
        if (item) updated.judgment = autoJudge(value, item.lowerLimit, item.upperLimit);
      }
      return { ...c, measurements: { ...c.measurements, [itemId]: updated } };
    }));
  }

  function setAllOk(colIdx: number) {
    setCols((prev) => prev.map((c, i) => {
      if (i !== colIdx) return c;
      const measurements = { ...c.measurements };
      for (const [id, m] of Object.entries(measurements)) {
        if (!m.judgment) measurements[id] = { ...m, judgment: "OK" };
      }
      return { ...c, measurements };
    }));
  }

  const itemRows = step === "input" ? buildItemRows(cols) : [];

  // For a given col and itemRow, find the matching InspItem (same category+name)
  function findItem(col: ColEntry, row: ItemRow): InspItem | undefined {
    return col.schedule.items.find((it) => it.name === row.name && (it.category ?? "") === row.category);
  }

  const ngTotal = cols.reduce((sum, c) =>
    sum + Object.values(c.measurements).filter((m) => m.judgment === "NG").length, 0);

  async function handleSubmit() {
    setSaving(true);
    await Promise.all(cols.map((c) =>
      fetch(`/api/inspections/${c.schedule.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedBy: c.completedBy || undefined,
          completedAt: c.completedAt || undefined,
          measurements: c.schedule.items.map((it) => {
            const m = c.measurements[it.id] ?? { measuredValue: "", judgment: "" };
            return {
              id: it.id,
              measuredValue: m.measuredValue !== "" ? parseFloat(m.measuredValue) : undefined,
              judgment: m.judgment || undefined,
            };
          }),
        }),
      })
    ));
    onCompleted();
    onClose();
    setSaving(false);
  }

  // ── STEP 1: 機器選択 ──────────────────────────────────────
  if (step === "select") {
    const filteredIds = filteredSchedules.map((s) => s.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl m-4 flex flex-col" style={{ maxHeight: "92vh" }}>
          {/* ヘッダー */}
          <div className="p-5 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">一括点検入力 — 機器を選択</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selected.size}件選択中
                  {isFiltered && <span className="ml-2 text-blue-600">（{filteredSchedules.length}件表示中）</span>}
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 検索フィルター */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="機器名・管理番号"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={searchDept}
                onChange={(e) => setSearchDept(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">配備部署 すべて</option>
                {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">設置場所 すべて</option>
                {locationOptions.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">カテゴリ すべて</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={() => { setSearchName(""); setSearchDept(""); setSearchLocation(""); setSearchCategory(""); }}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                絞り込みを解除
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr className="text-xs text-gray-500">
                  <th className="px-4 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left">機器名</th>
                  <th className="px-4 py-2.5 text-left">配備部署</th>
                  <th className="px-4 py-2.5 text-left">設置場所</th>
                  <th className="px-4 py-2.5 text-center">予定日</th>
                  <th className="px-4 py-2.5 text-center">残り</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSchedules.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">該当する機器がありません</td></tr>
                ) : filteredSchedules.map((s) => {
                  const days = Math.ceil((new Date(s.scheduledAt).getTime() - Date.now()) / 86400000);
                  const isOverdue = days < 0;
                  const isSelected = selected.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => toggleSelect(s.id)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(s.id)}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">{s.device.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{s.device.deviceCode}</div>
                        <div className="text-xs text-gray-400">{s.device.category}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">{s.device.department ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">{s.device.location}</td>
                      <td className="px-4 py-2.5 text-center text-gray-500 text-xs">
                        {new Date(s.scheduledAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : days <= 7 ? "text-orange-500" : "text-gray-500"}`}>
                          {isOverdue ? `${Math.abs(days)}日超過` : `${days}日後`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0 items-center">
            {isFiltered && filteredSchedules.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const ids = filteredSchedules.map((s) => s.id);
                  setSelected((prev) => { const next = new Set(prev); ids.forEach((id) => next.add(id)); return next; });
                }}
                className="text-xs text-blue-600 border border-blue-300 rounded-lg px-3 py-2 hover:bg-blue-50 whitespace-nowrap"
              >
                表示中を全選択
              </button>
            )}
            <button
              type="button"
              onClick={goToInput}
              disabled={selected.size === 0}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {selected.size}件で点検入力へ →
            </button>
            <button type="button" onClick={onClose} className="px-6 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: マトリクス入力 ───────────────────────────────
  const anyLoading = cols.some((c) => c.loading);
  const COL_W = 180; // px per device column

  // group item rows by category for rendering section headers
  const categoryGroups: { cat: string; rows: ItemRow[] }[] = [];
  for (const row of itemRows) {
    const last = categoryGroups[categoryGroups.length - 1];
    if (last && last.cat === row.category) last.rows.push(row);
    else categoryGroups.push({ cat: row.category, rows: [row] });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full m-4 flex flex-col" style={{ maxHeight: "94vh", maxWidth: `min(96vw, ${180 + cols.length * COL_W + 32}px)` }}>
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep("select")} className="text-gray-400 hover:text-gray-700 text-xs flex items-center gap-1 border border-gray-200 rounded px-2 py-1">
                ← 機器選択に戻る
              </button>
              <h2 className="text-base font-semibold text-gray-900">一括点検入力</h2>
              <span className="text-sm text-gray-400">{cols.length}機器</span>
              {ngTotal > 0 && <span className="text-sm text-red-600 font-medium">NG {ngTotal}件</span>}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* 共通設定 */}
          <div className="flex items-end gap-3 p-3 bg-gray-50 rounded-xl">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">共通の点検日</label>
              <input type="date" value={commonDate} onChange={(e) => setCommonDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">共通の点検者</label>
              <input type="text" value={commonBy} onChange={(e) => setCommonBy(e.target.value)} placeholder="氏名・部署など"
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="button" onClick={applyCommon}
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-blue-700 whitespace-nowrap flex-shrink-0">
              全件に適用
            </button>
          </div>
        </div>

        {anyLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">点検項目を読み込み中...</div>
        ) : (
          /* マトリクステーブル */
          <div className="flex-1 overflow-auto">
            <table className="text-xs border-collapse" style={{ minWidth: `${180 + cols.length * COL_W}px` }}>
              <thead className="sticky top-0 z-10">
                {/* 機器名行 */}
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th className="sticky left-0 z-20 bg-gray-50 border-r border-gray-200 px-3 py-2 text-left text-gray-500 font-medium min-w-[180px]">
                    点検項目
                  </th>
                  {cols.map((col, ci) => {
                    const days = Math.ceil((new Date(col.schedule.scheduledAt).getTime() - Date.now()) / 86400000);
                    const isOverdue = days < 0;
                    const colNg = Object.values(col.measurements).filter((m) => m.judgment === "NG").length;
                    const colFilled = Object.values(col.measurements).filter((m) => m.judgment !== "").length;
                    return (
                      <th key={col.schedule.id} className="border-r border-gray-200 px-2 py-2 text-center" style={{ width: COL_W, minWidth: COL_W }}>
                        <div className="font-semibold text-gray-800 truncate">{col.schedule.device.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">{col.schedule.device.deviceCode}</div>
                        <div className="text-[10px] text-gray-500">{col.schedule.device.location}</div>
                        <div className="mt-0.5">
                          {isOverdue
                            ? <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{Math.abs(days)}日超過</span>
                            : <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">あと{days}日</span>
                          }
                          {colNg > 0 && <span className="ml-1 text-[10px] text-red-600 font-medium">NG {colNg}</span>}
                          {colNg === 0 && colFilled > 0 && <span className="ml-1 text-[10px] text-green-600">{colFilled}入力済</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
                {/* 点検日・点検者行 */}
                <tr className="bg-white border-b border-gray-200">
                  <td className="sticky left-0 z-20 bg-white border-r border-gray-200 px-3 py-1.5">
                    <div className="text-[10px] text-gray-400 font-medium">点検日 / 点検者</div>
                  </td>
                  {cols.map((col, ci) => (
                    <td key={col.schedule.id} className="border-r border-gray-100 px-1.5 py-1.5 text-center">
                      <div className="flex flex-col gap-1">
                        <input type="date" value={col.completedAt} onChange={(e) => updateColField(ci, "completedAt", e.target.value)}
                          className="w-full border border-gray-300 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <input type="text" value={col.completedBy} onChange={(e) => updateColField(ci, "completedBy", e.target.value)}
                          placeholder="点検者" className="w-full border border-gray-300 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </td>
                  ))}
                </tr>
                {/* 全OKボタン行 */}
                <tr className="bg-gray-50 border-b border-gray-200">
                  <td className="sticky left-0 z-20 bg-gray-50 border-r border-gray-200 px-3 py-1 text-[10px] text-gray-400">一括操作</td>
                  {cols.map((col, ci) => (
                    <td key={col.schedule.id} className="border-r border-gray-100 px-1.5 py-1 text-center">
                      <button type="button" onClick={() => setAllOk(ci)}
                        className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium hover:bg-green-200 w-full">
                        全項目 OK
                      </button>
                    </td>
                  ))}
                </tr>
              </thead>

              <tbody>
                {categoryGroups.map(({ cat, rows }) => (
                  <>
                    {/* カテゴリヘッダー行 */}
                    <tr key={`cat-${cat}`} className="bg-blue-50 border-t border-blue-200">
                      <td
                        className="sticky left-0 z-10 bg-blue-50 border-r border-blue-100 px-3 py-1.5 font-semibold text-blue-700 text-[11px]"
                        colSpan={1}
                      >
                        {cat}
                      </td>
                      {cols.map((col) => (
                        <td key={col.schedule.id} className="border-r border-blue-100 bg-blue-50 py-1.5" />
                      ))}
                    </tr>

                    {/* 項目行 */}
                    {rows.map((row) => (
                      <tr key={row.key} className="border-t border-gray-100 hover:bg-gray-50/50 group">
                        {/* 左固定列: 項目名 */}
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 border-r border-gray-200 px-3 py-1.5 font-medium text-gray-700 min-w-[180px]">
                          {row.name}
                        </td>
                        {/* 各機器列 */}
                        {cols.map((col, ci) => {
                          const item = findItem(col, row);
                          if (!item) {
                            return (
                              <td key={col.schedule.id} className="border-r border-gray-100 bg-gray-50 px-2 py-1.5 text-center">
                                <span className="text-gray-300 text-[10px]">—</span>
                              </td>
                            );
                          }
                          const m = col.measurements[item.id] ?? { measuredValue: "", judgment: "" };
                          const isNg = m.judgment === "NG";
                          const isOk = m.judgment === "OK";
                          return (
                            <td key={col.schedule.id}
                              className={`border-r border-gray-100 px-1.5 py-1.5 ${isNg ? "bg-red-50" : isOk ? "bg-green-50/40" : ""}`}
                            >
                              <div className="flex flex-col gap-1">
                                <select
                                  value={m.judgment}
                                  onChange={(e) => updateMeasurement(ci, item.id, "judgment", e.target.value)}
                                  className={`w-full border rounded px-1 py-0.5 text-[11px] font-semibold text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    isOk ? "border-green-400 bg-green-100 text-green-700"
                                      : isNg ? "border-red-400 bg-red-100 text-red-700"
                                      : "border-gray-300 text-gray-500"
                                  }`}
                                >
                                  <option value="">—</option>
                                  <option value="OK">OK</option>
                                  <option value="NG">NG</option>
                                </select>
                                {(item.lowerLimit !== null || item.upperLimit !== null) && (
                                  <div className="flex items-center gap-0.5">
                                    <input
                                      type="number"
                                      value={m.measuredValue}
                                      onChange={(e) => updateMeasurement(ci, item.id, "measuredValue", e.target.value)}
                                      step="any"
                                      placeholder="測定値"
                                      className={`flex-1 min-w-0 border rounded px-1 py-0.5 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                        isNg ? "border-red-300 bg-red-50" : "border-gray-300"
                                      }`}
                                    />
                                    <span className="text-[9px] text-gray-400 whitespace-nowrap">
                                      {item.lowerLimit ?? "—"}〜{item.upperLimit ?? "—"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* フッター */}
        <div className="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || cols.length === 0 || anyLoading}
            className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : `${cols.length}件を完了として保存${ngTotal > 0 ? `（NG ${ngTotal}件あり）` : ""}`}
          </button>
          <button type="button" onClick={() => setStep("select")}
            className="px-5 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">
            ← 戻る
          </button>
          <button type="button" onClick={onClose}
            className="px-5 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
