"use client";

import { useEffect, useState, useCallback } from "react";

interface Device {
  id: string;
  deviceCode: string;
  name: string;
  cleanFieldCategory: string | null;
}

interface SterilizationCheck {
  id: string;
  deviceId: string;
  inspectedBy: string;
  judgment: string;
  notes: string | null;
  inspectedAt: string;
  device: { name: string; deviceCode: string; cleanFieldCategory: string | null };
}

const INSPECTORS = ["ME1", "ME2", "ME3", "ME4", "ME5"];

function formatDateTime(s: string) {
  const d = new Date(s);
  return d.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function RegisterModal({
  devices,
  onClose,
  onSaved,
}: {
  devices: Device[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [deviceId, setDeviceId] = useState("");
  const [inspectedBy, setInspectedBy] = useState("");
  const [judgment, setJudgment] = useState<"OK" | "NG" | "">("");
  const [notes, setNotes] = useState("");
  const [inspectedAt, setInspectedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Group devices by cleanFieldCategory
  const catMap = devices.reduce<Record<string, Device[]>>((acc, d) => {
    const key = d.cleanFieldCategory || "（未分類）";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});
  const sortedCats = Object.keys(catMap).sort((a, b) => {
    if (a === "（未分類）") return 1;
    if (b === "（未分類）") return -1;
    return a.localeCompare(b, "ja");
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId || !inspectedBy || !judgment) { setError("必須項目を入力してください"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/sterilization-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, inspectedBy, judgment, notes, inspectedAt }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "保存に失敗しました");
    } else {
      onSaved();
      onClose();
    }
    setSaving(false);
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">滅菌前点検を登録</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">点検日時 <span className="text-red-500">*</span></label>
            <input type="datetime-local" value={inspectedAt} onChange={(e) => setInspectedAt(e.target.value)} className={inputCls} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">機器名 <span className="text-red-500">*</span></label>
            <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={inputCls} required>
              <option value="">選択してください</option>
              {sortedCats.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {catMap[cat].map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">点検者 <span className="text-red-500">*</span></label>
            <select value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} className={inputCls} required>
              <option value="">選択してください</option>
              {INSPECTORS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">判定 <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {(["OK", "NG"] as const).map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setJudgment(j)}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold border-2 transition-colors ${
                    judgment === j
                      ? j === "OK"
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                      : j === "OK"
                      ? "border-green-300 text-green-600 hover:bg-green-50"
                      : "border-red-300 text-red-600 hover:bg-red-50"
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="特記事項があれば入力" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
              キャンセル
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {saving ? "登録中..." : "登録"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SterilizationCheckPage() {
  const [checks, setChecks] = useState<SterilizationCheck[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterJudgment, setFilterJudgment] = useState<"" | "OK" | "NG">("");
  const [filterDevice, setFilterDevice] = useState("");

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sterilization-checks");
    const data = await res.json();
    setChecks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChecks();
    fetch("/api/devices/clean-field").then((r) => r.json()).then(setDevices);
  }, [fetchChecks]);

  const filtered = checks.filter((c) => {
    if (filterJudgment && c.judgment !== filterJudgment) return false;
    if (filterDevice && !c.device.name.includes(filterDevice) && !c.device.deviceCode.includes(filterDevice)) return false;
    return true;
  });

  const okCount = checks.filter((c) => c.judgment === "OK").length;
  const ngCount = checks.filter((c) => c.judgment === "NG").length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">滅菌前点検</h1>
          <p className="text-sm text-gray-500 mt-0.5">清潔野機器の滅菌前点検記録</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          + 点検を登録
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "総点検数", value: checks.length, color: "text-gray-800", bg: "bg-gray-50" },
          { label: "OK", value: okCount, color: "text-green-700", bg: "bg-green-50" },
          { label: "NG", value: ngCount, color: "text-red-700", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-gray-100 px-5 py-4`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="機器名・管理番号で絞り込み"
          value={filterDevice}
          onChange={(e) => setFilterDevice(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-56"
        />
        <div className="flex gap-1.5">
          {(["", "OK", "NG"] as const).map((j) => (
            <button
              key={j}
              onClick={() => setFilterJudgment(j)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterJudgment === j
                  ? j === "OK" ? "bg-green-500 text-white" : j === "NG" ? "bg-red-500 text-white" : "bg-gray-700 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {j === "" ? "すべて" : j}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">点検記録がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">点検日時</th>
                <th className="px-4 py-3">機器名</th>
                <th className="px-4 py-3">カテゴリ</th>
                <th className="px-4 py-3">点検者</th>
                <th className="px-4 py-3 text-center">判定</th>
                <th className="px-4 py-3">備考</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDateTime(c.inspectedAt)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div>{c.device.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{c.device.deviceCode}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.device.cleanFieldCategory ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{c.inspectedBy}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                      c.judgment === "OK" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {c.judgment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <RegisterModal
          devices={devices}
          onClose={() => setShowModal(false)}
          onSaved={fetchChecks}
        />
      )}
    </div>
  );
}
