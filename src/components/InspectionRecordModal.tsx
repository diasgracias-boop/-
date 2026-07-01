"use client";

import { useEffect, useState } from "react";

interface DeviceInspectionItem {
  id: string;
  name: string;
  category?: string | null;
  lowerLimit: number | null;
  upperLimit: number | null;
}

interface InspectionRecordModalProps {
  deviceId: string;
  onClose: () => void;
  onSaved: () => void;
}

const INSP_CATS = ["外装・機能点検", "性能点検", "電気的安全性点検"] as const;

function autoJudge(value: string, lower: number | null, upper: number | null): string {
  const v = parseFloat(value);
  if (isNaN(v)) return "";
  if (lower !== null && v < lower) return "NG";
  if (upper !== null && v > upper) return "NG";
  return "OK";
}

export default function InspectionRecordModal({ deviceId, onClose, onSaved }: InspectionRecordModalProps) {
  const [items, setItems] = useState<DeviceInspectionItem[]>([]);
  const [measurements, setMeasurements] = useState<{ measuredValue: string; judgment: string }[]>([]);
  const [form, setForm] = useState({
    completedAt: new Date().toISOString().split("T")[0],
    intervalDays: "365",
    completedBy: "",
    description: "定期点検・動作確認",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/devices/${deviceId}`)
      .then((r) => r.json())
      .then((d) => {
        const list: DeviceInspectionItem[] = d.inspectionItems ?? [];
        setItems(list);
        setMeasurements(list.map(() => ({ measuredValue: "", judgment: "" })));
      });
  }, [deviceId]);

  function updateMeasurement(index: number, field: "measuredValue" | "judgment", value: string) {
    setMeasurements((prev) => prev.map((m, i) => {
      if (i !== index) return m;
      const updated = { ...m, [field]: value };
      if (field === "measuredValue") {
        const item = items[index];
        updated.judgment = autoJudge(value, item.lowerLimit, item.upperLimit);
      }
      return updated;
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/inspections/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        completedAt: form.completedAt,
        intervalDays: parseInt(form.intervalDays),
        description: form.description,
        completedBy: form.completedBy || undefined,
        measurements: items.map((item, i) => ({
          name: item.name,
          category: item.category ?? null,
          lowerLimit: item.lowerLimit,
          upperLimit: item.upperLimit,
          measuredValue: measurements[i]?.measuredValue !== "" ? parseFloat(measurements[i].measuredValue) : undefined,
          judgment: measurements[i]?.judgment || undefined,
        })),
      }),
    });
    onSaved();
    onClose();
    setSaving(false);
  }

  const ngCount = measurements.filter((m) => m.judgment === "NG").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">点検実施を追加</h2>
          <p className="text-xs text-gray-500 mt-1">次回の点検予定は実施日＋点検周期で自動作成されます。</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">実施日 *</label>
              <input
                type="date"
                value={form.completedAt}
                onChange={(e) => setForm((f) => ({ ...f, completedAt: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">点検周期 *</label>
              <select
                value={form.intervalDays}
                onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30">月次（30日）</option>
                <option value="90">四半期（90日）</option>
                <option value="180">半年（180日）</option>
                <option value="365">年次（365日）</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">点検者</label>
              <input
                type="text"
                value={form.completedBy}
                onChange={(e) => setForm((f) => ({ ...f, completedBy: e.target.value }))}
                placeholder="氏名・部署など"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">点検内容 *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
                placeholder="例: 定期点検・動作確認"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 点検項目 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">点検項目（機器情報より）</label>
            {items.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                この機器には点検項目が登録されていません。機器情報フォームで設定してください。
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500 font-medium border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-2 py-1.5">点検項目</th>
                      <th className="text-center px-2 py-1.5 w-20">判定</th>
                      <th className="text-center px-2 py-1.5 w-24">測定値</th>
                      <th className="text-center px-2 py-1.5 w-14">上限</th>
                      <th className="text-center px-2 py-1.5 w-14">下限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows: React.ReactNode[] = [];
                      let lastCat: string | null = null;
                      items.forEach((item, idx) => {
                        const cat = item.category ?? "";
                        const isKnownCat = (INSP_CATS as readonly string[]).includes(cat);
                        if (isKnownCat && cat !== lastCat) {
                          lastCat = cat;
                          rows.push(
                            <tr key={`cat-${cat}`} className="bg-blue-50">
                              <td colSpan={5} className="px-2 py-1 text-xs font-semibold text-blue-700 border-t border-blue-100">{cat}</td>
                            </tr>
                          );
                        }
                        const m = measurements[idx];
                        if (!m) return;
                        const isNg = m.judgment === "NG";
                        const isOk = m.judgment === "OK";
                        rows.push(
                          <tr key={item.id} className={`border-t border-gray-100 ${isNg ? "bg-red-50" : isOk ? "bg-green-50/40" : ""}`}>
                            <td className="px-2 py-1 text-gray-800 font-medium text-xs">{item.name}</td>
                            <td className="px-2 py-1">
                              <select
                                value={m.judgment}
                                onChange={(e) => updateMeasurement(idx, "judgment", e.target.value)}
                                className={`w-full border rounded px-1 py-0.5 text-xs font-semibold text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${isOk ? "border-green-400 bg-green-100 text-green-700" : isNg ? "border-red-400 bg-red-100 text-red-700" : "border-gray-300 text-gray-500"}`}
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
                                onChange={(e) => updateMeasurement(idx, "measuredValue", e.target.value)}
                                step="any"
                                placeholder="—"
                                className={`w-full border rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${isNg ? "border-red-300 bg-red-50" : "border-gray-300"}`}
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
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : `点検実施として保存${ngCount > 0 ? `（NG ${ngCount}件）` : ""}`}
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
