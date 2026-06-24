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
  device: { name: string; deviceCode: string; location: string };
  items: InspItem[];
}

interface Measurement {
  id: string;
  measuredValue: string;
  judgment: string;
}

interface ScheduleEntry {
  schedule: Schedule;
  selected: boolean;
  completedAt: string;
  completedBy: string;
  measurements: Measurement[];
  loadingItems: boolean;
  expanded: boolean;
}

interface Props {
  schedules: Schedule[];
  onClose: () => void;
  onCompleted: () => void;
}

function autoJudge(v: string, lower: number | null, upper: number | null) {
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  if (lower !== null && n < lower) return "NG";
  if (upper !== null && n > upper) return "NG";
  return "OK";
}

const today = new Date().toISOString().split("T")[0];

export default function BulkInspectionModal({ schedules: initialSchedules, onClose, onCompleted }: Props) {
  const [entries, setEntries] = useState<ScheduleEntry[]>(
    initialSchedules.map((s) => ({
      schedule: s,
      selected: true,
      completedAt: today,
      completedBy: "",
      measurements: s.items.map((it) => ({ id: it.id, measuredValue: "", judgment: "" })),
      loadingItems: s.items.length === 0,
      expanded: false,
    }))
  );
  const [commonDate, setCommonDate] = useState(today);
  const [commonBy, setCommonBy] = useState("");
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);

  // populate-items for schedules with no items
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    entries.forEach((entry, idx) => {
      if (entry.schedule.items.length === 0) {
        fetch(`/api/inspections/${entry.schedule.id}/populate-items`, { method: "POST" })
          .then((r) => r.json())
          .then((items: InspItem[]) => {
            setEntries((prev) => prev.map((e, i) =>
              i !== idx ? e : {
                ...e,
                schedule: { ...e.schedule, items },
                measurements: items.map((it) => ({ id: it.id, measuredValue: "", judgment: "" })),
                loadingItems: false,
              }
            ));
          });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyCommon() {
    setEntries((prev) => prev.map((e) => ({
      ...e,
      completedAt: commonDate || e.completedAt,
      completedBy: commonBy || e.completedBy,
    })));
  }

  function toggleSelect(idx: number) {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e));
  }

  function toggleExpand(idx: number) {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, expanded: !e.expanded } : e));
  }

  function updateEntry<K extends keyof ScheduleEntry>(idx: number, field: K, value: ScheduleEntry[K]) {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  function updateMeasurement(entryIdx: number, measIdx: number, field: "measuredValue" | "judgment", value: string) {
    setEntries((prev) => prev.map((e, i) => {
      if (i !== entryIdx) return e;
      const measurements = e.measurements.map((m, j) => {
        if (j !== measIdx) return m;
        const updated = { ...m, [field]: value };
        if (field === "measuredValue") {
          const item = e.schedule.items[j];
          updated.judgment = autoJudge(value, item.lowerLimit, item.upperLimit);
        }
        return updated;
      });
      return { ...e, measurements };
    }));
  }

  function setAllOk(entryIdx: number) {
    setEntries((prev) => prev.map((e, i) =>
      i !== entryIdx ? e : {
        ...e,
        measurements: e.measurements.map((m) => ({ ...m, judgment: m.judgment === "" ? "OK" : m.judgment })),
      }
    ));
  }

  const selectedCount = entries.filter((e) => e.selected).length;
  const ngTotal = entries.filter((e) => e.selected).reduce((sum, e) => sum + e.measurements.filter((m) => m.judgment === "NG").length, 0);

  async function handleSubmit() {
    setSaving(true);
    const toComplete = entries.filter((e) => e.selected);
    await Promise.all(toComplete.map((e) =>
      fetch(`/api/inspections/${e.schedule.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedBy: e.completedBy || undefined,
          completedAt: e.completedAt || undefined,
          measurements: e.measurements.map((m) => ({
            id: m.id,
            measuredValue: m.measuredValue !== "" ? parseFloat(m.measuredValue) : undefined,
            judgment: m.judgment || undefined,
          })),
        }),
      })
    ));
    onCompleted();
    onClose();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl m-4 flex flex-col" style={{ maxHeight: "92vh" }}>
        {/* ヘッダー */}
        <div className="p-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">一括点検入力</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {entries.length}件の点検予定 ／ {selectedCount}件選択中
                {ngTotal > 0 && <span className="ml-2 text-red-600 font-medium">NG {ngTotal}件</span>}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* 共通設定 */}
          <div className="mt-3 flex items-end gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">共通の点検日</label>
              <input
                type="date"
                value={commonDate}
                onChange={(e) => setCommonDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">共通の点検者</label>
              <input
                type="text"
                value={commonBy}
                onChange={(e) => setCommonBy(e.target.value)}
                placeholder="氏名・部署など"
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={applyCommon}
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-blue-700 whitespace-nowrap"
            >
              全件に適用
            </button>
          </div>
        </div>

        {/* スケジュール一覧 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {entries.map((entry, idx) => {
            const s = entry.schedule;
            const days = Math.ceil((new Date(s.scheduledAt).getTime() - Date.now()) / 86400000);
            const isOverdue = days < 0;
            const ngCount = entry.measurements.filter((m) => m.judgment === "NG").length;
            const filledCount = entry.measurements.filter((m) => m.judgment !== "").length;
            return (
              <div
                key={s.id}
                className={`border rounded-xl overflow-hidden transition-all ${
                  !entry.selected ? "opacity-50 border-gray-200" : isOverdue ? "border-red-300" : "border-blue-200"
                }`}
              >
                {/* スケジュールヘッダー行 */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={entry.selected}
                    onChange={() => toggleSelect(idx)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{s.device.name}</span>
                      <span className="text-xs text-gray-400 font-mono">{s.device.deviceCode}</span>
                      <span className="text-xs text-gray-500">{s.device.location}</span>
                      {isOverdue
                        ? <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{Math.abs(days)}日超過</span>
                        : <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">あと{days}日</span>
                      }
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.description} ／ 予定日: {new Date(s.scheduledAt).toLocaleDateString("ja-JP")} ／ {s.items.length}項目</div>
                  </div>
                  {entry.selected && (
                    <div className="text-xs text-gray-400 text-right flex-shrink-0">
                      {filledCount}/{s.items.length}入力
                      {ngCount > 0 && <span className="ml-1 text-red-600 font-medium">NG {ngCount}</span>}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleExpand(idx)}
                    className={`text-gray-400 hover:text-gray-600 transition-transform ${entry.expanded ? "rotate-180" : ""}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {/* 展開エリア */}
                {entry.expanded && (
                  <div className="border-t border-gray-200 p-4 space-y-3">
                    {/* 個別の点検日・点検者 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">点検日 *</label>
                        <input
                          type="date"
                          value={entry.completedAt}
                          onChange={(e) => updateEntry(idx, "completedAt", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">点検者</label>
                        <input
                          type="text"
                          value={entry.completedBy}
                          onChange={(e) => updateEntry(idx, "completedBy", e.target.value)}
                          placeholder="氏名・部署など"
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* 点検項目 */}
                    {entry.loadingItems ? (
                      <p className="text-xs text-gray-400">点検項目を読み込み中...</p>
                    ) : s.items.length === 0 ? (
                      <p className="text-xs text-gray-400">点検項目がありません。</p>
                    ) : (
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-xs text-gray-500 font-medium border-b border-gray-200">
                            <th className="text-left px-2 py-1.5">点検項目</th>
                            <th className="text-center px-2 py-1.5 w-20">
                              <div className="flex items-center justify-center gap-1">
                                <span>判定</span>
                                <button
                                  type="button"
                                  onClick={() => setAllOk(idx)}
                                  className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium hover:bg-green-200"
                                >全OK</button>
                              </div>
                            </th>
                            <th className="text-center px-2 py-1.5 w-24">測定値</th>
                            <th className="text-center px-2 py-1.5 w-14">上限</th>
                            <th className="text-center px-2 py-1.5 w-14">下限</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const rows: React.ReactNode[] = [];
                            let lastCat: string | null = null;
                            s.items.forEach((item, measIdx) => {
                              const cat = item.category ?? "";
                              const isKnown = (INSP_CATS as readonly string[]).includes(cat);
                              if (isKnown && cat !== lastCat) {
                                lastCat = cat;
                                rows.push(
                                  <tr key={`cat-${cat}`} className="bg-blue-50">
                                    <td colSpan={5} className="px-2 py-1 text-xs font-semibold text-blue-700 border-t border-blue-100">{cat}</td>
                                  </tr>
                                );
                              }
                              const m = entry.measurements[measIdx];
                              if (!m) return;
                              const isNg = m.judgment === "NG";
                              const isOk = m.judgment === "OK";
                              rows.push(
                                <tr key={item.id} className={`border-t border-gray-100 ${isNg ? "bg-red-50" : isOk ? "bg-green-50/40" : "hover:bg-gray-50"}`}>
                                  <td className="px-2 py-1 text-xs text-gray-800 font-medium">{item.name}</td>
                                  <td className="px-2 py-1">
                                    <select
                                      value={m.judgment}
                                      onChange={(e) => updateMeasurement(idx, measIdx, "judgment", e.target.value)}
                                      className={`w-full border rounded px-1 py-0.5 text-xs font-semibold text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                        isOk ? "border-green-400 bg-green-100 text-green-700"
                                          : isNg ? "border-red-400 bg-red-100 text-red-700"
                                          : "border-gray-300 text-gray-500"
                                      }`}
                                    >
                                      <option value="">—</option>
                                      <option value="OK">OK</option>
                                      <option value="NG">NG</option>
                                    </select>
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      type="number"
                                      value={m.measuredValue}
                                      onChange={(e) => updateMeasurement(idx, measIdx, "measuredValue", e.target.value)}
                                      step="any"
                                      placeholder="—"
                                      className={`w-full border rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                        isNg ? "border-red-300 bg-red-50" : "border-gray-300"
                                      }`}
                                    />
                                  </td>
                                  <td className="px-2 py-1 text-center text-gray-400 text-xs">{item.upperLimit ?? "—"}</td>
                                  <td className="px-2 py-1 text-center text-gray-400 text-xs">{item.lowerLimit ?? "—"}</td>
                                </tr>
                              );
                            });
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || selectedCount === 0}
            className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : `選択した${selectedCount}件を完了として保存${ngTotal > 0 ? `（NG ${ngTotal}件あり）` : ""}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
