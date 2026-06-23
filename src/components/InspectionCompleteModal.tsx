"use client";

import { useState } from "react";

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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">点検完了</h2>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 mb-6">点検項目はありません。</p>
          ) : (
            <div className="mb-6">
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1 mb-2">
                <div className="col-span-4">点検項目</div>
                <div className="col-span-2 text-center">下限</div>
                <div className="col-span-2 text-center">上限</div>
                <div className="col-span-2">測定値</div>
                <div className="col-span-2">判定</div>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => {
                  const m = measurements[index];
                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4 text-sm text-gray-800">{item.name}</div>
                      <div className="col-span-2 text-sm text-center text-gray-500">
                        {item.lowerLimit ?? "—"}
                      </div>
                      <div className="col-span-2 text-sm text-center text-gray-500">
                        {item.upperLimit ?? "—"}
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={m.measuredValue}
                          onChange={(e) => updateMeasurement(index, "measuredValue", e.target.value)}
                          step="any"
                          placeholder="値"
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={m.judgment}
                          onChange={(e) => updateMeasurement(index, "judgment", e.target.value)}
                          className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            m.judgment === "OK"
                              ? "border-green-400 bg-green-50 text-green-700"
                              : m.judgment === "NG"
                              ? "border-red-400 bg-red-50 text-red-700"
                              : "border-gray-300 text-gray-600"
                          }`}
                        >
                          <option value="">—</option>
                          <option value="OK">OK</option>
                          <option value="NG">NG</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "完了として保存"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
