"use client";

import { useRef, useState } from "react";

interface InspectionItem {
  id: string;
  name: string;
  lowerLimit: number | null;
  upperLimit: number | null;
}

interface Props {
  scheduleId: string;
  description: string;
  items: InspectionItem[];
  onClose: () => void;
  onCompleted: () => void;
}

interface Measurement {
  id: string;
  measuredValue: string;
  judgment: string;
}

function autoJudge(value: string, lower: number | null, upper: number | null): string {
  const v = parseFloat(value);
  if (isNaN(v)) return "";
  if (lower !== null && v < lower) return "NG";
  if (upper !== null && v > upper) return "NG";
  return "OK";
}

export default function InspectionCompleteModal({ scheduleId, description, items, onClose, onCompleted }: Props) {
  const [measurements, setMeasurements] = useState<Measurement[]>(
    items.map((item) => ({ id: item.id, measuredValue: "", judgment: "" }))
  );
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const filledCount = measurements.filter((m) => m.judgment !== "").length;
  const ngCount = measurements.filter((m) => m.judgment === "NG").length;
  const progress = items.length > 0 ? Math.round((filledCount / items.length) * 100) : 0;

  function updateMeasurement(index: number, field: "measuredValue" | "judgment", value: string) {
    setMeasurements((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const updated = { ...m, [field]: value };
        if (field === "measuredValue") {
          const item = items[index];
          updated.judgment = autoJudge(value, item.lowerLimit, item.upperLimit);
        }
        return updated;
      })
    );
  }

  function setAllOk() {
    setMeasurements((prev) =>
      prev.map((m) => ({ ...m, judgment: m.judgment === "" ? "OK" : m.judgment }))
    );
  }

  function handleValueKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = measurements.map((m) => ({
      id: m.id,
      measuredValue: m.measuredValue !== "" ? parseFloat(m.measuredValue) : undefined,
      judgment: m.judgment || undefined,
    }));
    await fetch(`/api/inspections/${scheduleId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ measurements: payload }),
    });
    onCompleted();
    onClose();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl m-4 flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* ヘッダー */}
        <div className="p-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">点検完了入力</h2>
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            </div>
            {items.length > 0 && (
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-gray-500 mb-1">
                  {filledCount}/{items.length} 入力済み
                  {ngCount > 0 && (
                    <span className="ml-2 text-red-600 font-medium">NG {ngCount}件</span>
                  )}
                </div>
                <div className="w-40 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${ngCount > 0 ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* テーブル */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">点検項目はありません。</div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="text-xs text-gray-500 font-medium border-b border-gray-200">
                    <th className="text-left px-3 py-2">点検項目</th>
                    <th className="text-center px-2 py-2 w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>判定</span>
                        <button
                          type="button"
                          onClick={setAllOk}
                          className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium hover:bg-green-200 leading-none"
                        >
                          全OK
                        </button>
                      </div>
                    </th>
                    <th className="text-center px-2 py-2 w-24">測定値</th>
                    <th className="text-center px-2 py-2 w-16">上限</th>
                    <th className="text-center px-2 py-2 w-16">下限</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => {
                    const m = measurements[index];
                    const isNg = m.judgment === "NG";
                    const isOk = m.judgment === "OK";
                    return (
                      <tr
                        key={item.id}
                        className={`${isNg ? "bg-red-50" : isOk ? "bg-green-50/40" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-3 py-1.5 text-gray-800 font-medium">{item.name}</td>
                        <td className="px-2 py-1.5">
                          <select
                            value={m.judgment}
                            onChange={(e) => updateMeasurement(index, "judgment", e.target.value)}
                            className={`w-full border rounded px-1.5 py-1 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isOk
                                ? "border-green-400 bg-green-100 text-green-700"
                                : isNg
                                ? "border-red-400 bg-red-100 text-red-700"
                                : "border-gray-300 text-gray-500"
                            }`}
                          >
                            <option value="">—</option>
                            <option value="OK">OK</option>
                            <option value="NG">NG</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="number"
                            value={m.measuredValue}
                            onChange={(e) => updateMeasurement(index, "measuredValue", e.target.value)}
                            onKeyDown={(e) => handleValueKeyDown(e, index)}
                            step="any"
                            placeholder="—"
                            className={`w-full border rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isNg ? "border-red-300 bg-red-50" : "border-gray-300"
                            }`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center text-gray-500 text-xs">
                          {item.upperLimit ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center text-gray-500 text-xs">
                          {item.lowerLimit ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* フッターボタン */}
          <div className="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "保存中..." : `完了として保存${ngCount > 0 ? `（NG ${ngCount}件あり）` : ""}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
