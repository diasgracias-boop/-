"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface Device {
  id: string;
  deviceCode: string;
  name: string;
  cleanFieldCategory: string | null;
}

interface SelectedDevice {
  deviceId: string;
  name: string;
  deviceCode: string;
  category: string | null;
  inspectedBy: string;
  inspectedAt: string | null;
  judgment: "OK" | "NG";
  rowChecked: boolean;
}

interface CheckRecord {
  id: string;
  deviceId: string;
  inspectedBy: string;
  judgment: string;
  notes: string | null;
  inspectedAt: string;
  device: { name: string; deviceCode: string; cleanFieldCategory: string | null };
}

const INSPECTORS = ["ME1", "ME2", "ME3", "ME4", "ME5"];
const TIME_SLOTS = [
  "午前（第1回）",
  "午前（第2回）",
  "午後（第1回）",
  "午後（第2回）",
  "夜間",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function nowStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function fmtDt(s: string) {
  return new Date(s).toLocaleString("ja-JP", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function SterilizationCheckPage() {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // --- New registration state ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [date, setDate] = useState(todayStr);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCandidates, setShowCandidates] = useState(false);
  const [selected, setSelected] = useState<SelectedDevice[]>([]);
  const [bulkInspector, setBulkInspector] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  // --- History state ---
  const [records, setRecords] = useState<CheckRecord[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histDateFilter, setHistDateFilter] = useState("");
  const [histSearch, setHistSearch] = useState("");
  const [histJudgment, setHistJudgment] = useState("");

  // --- Edit modal state ---
  const [editRecord, setEditRecord] = useState<CheckRecord | null>(null);
  const [editInspectedAt, setEditInspectedAt] = useState("");
  const [editInspector, setEditInspector] = useState("");
  const [editJudgment, setEditJudgment] = useState("OK");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetch("/api/devices/clean-field").then((r) => r.json()).then(setDevices);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowCandidates(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    const r = await fetch("/api/sterilization-checks");
    const data = await r.json();
    setRecords(data);
    setHistLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab, loadHistory]);

  const filteredRecords = records.filter((r) => {
    if (histDateFilter && !r.inspectedAt.startsWith(histDateFilter)) return false;
    if (histJudgment && r.judgment !== histJudgment) return false;
    if (histSearch) {
      const q = histSearch.toLowerCase();
      if (!r.device.name.toLowerCase().includes(q) && !(r.inspectedBy || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const candidates = searchQuery.trim()
    ? devices.filter((d) => d.name.includes(searchQuery) || d.deviceCode.includes(searchQuery))
    : [];

  function toggleCandidate(d: Device, checked: boolean) {
    if (checked) {
      setSelected((prev) =>
        prev.some((s) => s.deviceId === d.id)
          ? prev
          : [...prev, { deviceId: d.id, name: d.name, deviceCode: d.deviceCode, category: d.cleanFieldCategory, inspectedBy: "", inspectedAt: null, judgment: "OK" as const, rowChecked: false }]
      );
    } else {
      setSelected((prev) => prev.filter((s) => s.deviceId !== d.id));
    }
  }

  function removeDevice(deviceId: string) {
    setSelected((prev) => prev.filter((s) => s.deviceId !== deviceId));
  }

  function setInspector(deviceId: string, inspector: string) {
    setSelected((prev) =>
      prev.map((s) =>
        s.deviceId === deviceId
          ? { ...s, inspectedBy: inspector, inspectedAt: inspector ? nowStr() : null, judgment: inspector ? "OK" as const : s.judgment }
          : s
      )
    );
  }

  function toggleRowCheck(deviceId: string) {
    setSelected((prev) =>
      prev.map((s) => s.deviceId === deviceId ? { ...s, rowChecked: !s.rowChecked } : s)
    );
  }

  function toggleAllCheck() {
    const allChecked = selected.every((s) => s.rowChecked);
    setSelected((prev) => prev.map((s) => ({ ...s, rowChecked: !allChecked })));
  }

  function applyBulkInspector() {
    if (!bulkInspector) return;
    const now = nowStr();
    setSelected((prev) =>
      prev.map((s) =>
        s.rowChecked ? { ...s, inspectedBy: bulkInspector, inspectedAt: now } : s
      )
    );
    setBulkInspector("");
  }

  const handleRegister = useCallback(async () => {
    const toSave = selected.filter((s) => s.inspectedBy);
    if (toSave.length === 0) return;
    setSaving(true);
    await Promise.all(
      toSave.map((s) =>
        fetch("/api/sterilization-checks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: s.deviceId,
            inspectedBy: s.inspectedBy,
            judgment: s.judgment,
            notes: `${date} ${timeSlot}`,
            inspectedAt: s.inspectedAt ?? `${date}T00:00`,
          }),
        })
      )
    );
    setSaving(false);
    setSelected((prev) => prev.filter((s) => !s.inspectedBy));
    await loadHistory();
    setActiveTab("history");
  }, [selected, date, timeSlot]);

  function openEdit(r: CheckRecord) {
    setEditRecord(r);
    setEditInspectedAt(r.inspectedAt ? r.inspectedAt.slice(0, 16) : "");
    setEditInspector(r.inspectedBy || "");
    setEditJudgment(r.judgment || "OK");
    setEditNotes(r.notes || "");
  }

  async function saveEdit() {
    if (!editRecord) return;
    setEditSaving(true);
    await fetch("/api/sterilization-checks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editRecord.id,
        inspectedBy: editInspector,
        judgment: editJudgment,
        notes: editNotes,
        inspectedAt: editInspectedAt,
      }),
    });
    setEditSaving(false);
    setEditRecord(null);
    loadHistory();
  }

  async function deleteRecord() {
    if (!editRecord) return;
    if (!confirm("この点検記録を削除しますか？")) return;
    await fetch(`/api/sterilization-checks?id=${editRecord.id}`, { method: "DELETE" });
    setEditRecord(null);
    loadHistory();
  }

  const checkedCount = selected.filter((s) => s.rowChecked).length;
  const allChecked = selected.length > 0 && selected.every((s) => s.rowChecked);

  return (
    <div className="flex flex-col h-full">
      {/* Header: 上段タイトル+コントロール / 下段タブ */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-6 pt-3 pb-1">
          <h1 className="text-lg font-bold text-gray-900 mr-2">滅菌前点検</h1>
          {/* Controls: new registration */}
          {activeTab === "new" && (
            <div className="flex items-center gap-3 ml-auto">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={handleRegister}
                disabled={saving || selected.filter((s) => s.inspectedBy).length === 0}
                className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "登録中..." : "登録"}
              </button>
            </div>
          )}
          {/* Controls: history */}
          {activeTab === "history" && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={histDateFilter}
                onChange={(e) => setHistDateFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="text"
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                placeholder="機器名・点検者で検索"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-52"
              />
              <select
                value={histJudgment}
                onChange={(e) => setHistJudgment(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">判定：すべて</option>
                <option value="OK">OK</option>
                <option value="NG">NG</option>
              </select>
              <button
                onClick={() => { setHistDateFilter(""); setHistSearch(""); setHistJudgment(""); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                クリア
              </button>
            </div>
          )}
        </div>
        {/* タブ（アンダーライン型） */}
        <div className="flex px-6">
          <button
            onClick={() => setActiveTab("new")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "new" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            新規登録
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "history" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            点検記録
          </button>
        </div>
      </div>


      {/* New registration panel */}
      {activeTab === "new" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Device search */}
          <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col p-4 gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">機器を追加</p>
            <div className="relative" ref={searchRef}>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowCandidates(true); }}
                  onFocus={() => setShowCandidates(true)}
                  placeholder="機器名・管理番号で検索"
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setShowCandidates(false); }}
                    className="px-2 border border-gray-300 rounded-lg text-gray-400 hover:text-gray-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              {showCandidates && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-72 overflow-y-auto">
                  {candidates.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-gray-400">該当なし</div>
                  ) : (
                    candidates.map((d) => {
                      const isSelected = selected.some((s) => s.deviceId === d.id);
                      return (
                        <label key={d.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 last:border-0 ${isSelected ? "bg-teal-50" : "hover:bg-teal-50"}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleCandidate(d, e.target.checked)}
                            className="w-4 h-4 accent-teal-600"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{d.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{d.deviceCode}</div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400">
              {selected.length > 0 ? `${selected.length}台 選択中` : "検索して機器を追加"}
            </div>
          </div>

          {/* Right: Selected device list */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            {/* Bulk inspector bar */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
              <span className="text-xs text-gray-500 mr-1">
                {checkedCount > 0 ? `${checkedCount}台選択中` : "チェックした機器に一括入力"}
              </span>
              <select
                value={bulkInspector}
                onChange={(e) => setBulkInspector(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">点検者を選択</option>
                {INSPECTORS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <button
                onClick={applyBulkInspector}
                disabled={!bulkInspector || checkedCount === 0}
                className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
              >
                一括点検者入力
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              {selected.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  左の検索ボックスから機器を追加してください
                </div>
              ) : (
                <table className="w-full text-sm bg-white">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-3 py-2 w-8">
                        <input type="checkbox" checked={allChecked} onChange={toggleAllCheck} className="w-4 h-4 accent-teal-600" />
                      </th>
                      <th className="px-3 py-2">機器名</th>
                      <th className="px-3 py-2 text-center w-12">CE</th>
                      <th className="px-3 py-2 w-36">点検者</th>
                      <th className="px-3 py-2 w-32">点検日時</th>
                      <th className="px-3 py-2 text-center w-20">判定</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selected.map((s) => (
                      <tr key={s.deviceId} className={s.rowChecked ? "bg-teal-50" : "hover:bg-gray-50"}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={s.rowChecked} onChange={() => toggleRowCheck(s.deviceId)} className="w-4 h-4 accent-teal-600" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{s.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{s.deviceCode}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={!!s.inspectedBy} readOnly className="w-4 h-4 accent-teal-600 cursor-default" />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={s.inspectedBy}
                            onChange={(e) => setInspector(s.deviceId, e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                          >
                            <option value="">—</option>
                            {INSPECTORS.map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {s.inspectedAt ? fmtDt(s.inspectedAt) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {s.inspectedBy ? (
                            <button
                              onClick={() => setSelected((prev) => prev.map((x) => x.deviceId === s.deviceId ? { ...x, judgment: x.judgment === "OK" ? "NG" : "OK" } : x))}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${s.judgment === "OK" ? "bg-teal-50 text-teal-700 hover:bg-teal-100" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                            >
                              {s.judgment}
                            </button>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeDevice(s.deviceId)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History panel */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto">
          {histLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">読み込み中...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">記録がありません</div>
          ) : (
            <table className="w-full text-sm bg-white">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-2 w-36">点検日時</th>
                  <th className="px-4 py-2">機器名</th>
                  <th className="px-4 py-2 w-28">点検者</th>
                  <th className="px-4 py-2 text-center w-12">CE</th>
                  <th className="px-4 py-2 text-center w-16">判定</th>
                  <th className="px-4 py-2 w-56">備考</th>
                  <th className="px-4 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtDt(r.inspectedAt)}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{r.device.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{r.device.deviceCode}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.inspectedBy || "—"}</td>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" checked={!!r.inspectedBy} readOnly className="w-4 h-4 accent-teal-600 cursor-default" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.judgment === "OK" ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"}`}>
                        {r.judgment}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{r.notes || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium px-2 py-1 border border-teal-200 rounded-md hover:bg-teal-50 transition-colors"
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setEditRecord(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">点検記録の編集</h2>
              <button onClick={() => setEditRecord(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">機器名</label>
                <div className="text-sm text-gray-900 font-medium py-1.5">
                  {editRecord.device.name}（{editRecord.device.deviceCode}）
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">点検日時</label>
                <input
                  type="datetime-local"
                  value={editInspectedAt}
                  onChange={(e) => setEditInspectedAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">点検者</label>
                <select
                  value={editInspector}
                  onChange={(e) => setEditInspector(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">—</option>
                  {INSPECTORS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">判定</label>
                <div className="flex gap-4">
                  {["OK", "NG"].map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={editJudgment === v}
                        onChange={() => setEditJudgment(v)}
                        className={v === "OK" ? "accent-teal-600" : "accent-red-500"}
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder="備考を入力"
                />
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-between">
              <button onClick={deleteRecord} className="text-sm text-red-500 hover:text-red-700 font-medium px-2 py-1">
                削除
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditRecord(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40"
                >
                  {editSaving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
