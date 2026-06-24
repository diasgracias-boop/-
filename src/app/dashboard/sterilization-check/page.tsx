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
  rowChecked: boolean;
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

  const candidates = searchQuery.trim()
    ? devices.filter((d) => d.name.includes(searchQuery) || d.deviceCode.includes(searchQuery))
    : [];

  function toggleCandidate(d: Device, checked: boolean) {
    if (checked) {
      setSelected((prev) =>
        prev.some((s) => s.deviceId === d.id)
          ? prev
          : [...prev, { deviceId: d.id, name: d.name, deviceCode: d.deviceCode, category: d.cleanFieldCategory, inspectedBy: "", inspectedAt: null, rowChecked: false }]
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
          ? { ...s, inspectedBy: inspector, inspectedAt: inspector ? nowStr() : null }
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
            judgment: "OK",
            notes: `${date} ${timeSlot}`,
            inspectedAt: s.inspectedAt ?? `${date}T00:00`,
          }),
        })
      )
    );
    setSaving(false);
    setSavedMsg(`${toSave.length}件を登録しました`);
    setSelected((prev) => prev.filter((s) => !s.inspectedBy));
    setTimeout(() => setSavedMsg(""), 3000);
  }, [selected, date, timeSlot]);

  const checkedCount = selected.filter((s) => s.rowChecked).length;
  const allChecked = selected.length > 0 && selected.every((s) => s.rowChecked);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900 mr-2">滅菌前点検</h1>
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
        {savedMsg && <span className="text-sm text-teal-700 font-medium">{savedMsg}</span>}
      </div>

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
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAllCheck}
                        className="w-4 h-4 accent-teal-600"
                      />
                    </th>
                    <th className="px-3 py-2">機器名</th>
                    <th className="px-3 py-2 text-center w-12">CE</th>
                    <th className="px-3 py-2 w-36">点検者</th>
                    <th className="px-3 py-2 w-32">点検日時</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selected.map((s) => (
                    <tr key={s.deviceId} className={s.rowChecked ? "bg-teal-50" : "hover:bg-gray-50"}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={s.rowChecked}
                          onChange={() => toggleRowCheck(s.deviceId)}
                          className="w-4 h-4 accent-teal-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{s.deviceCode}</div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!s.inspectedBy}
                          readOnly
                          className="w-4 h-4 accent-teal-600 cursor-default"
                        />
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
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeDevice(s.deviceId)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
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
    </div>
  );
}
