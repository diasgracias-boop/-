"use client";

import { useEffect, useState } from "react";

interface Device {
  id: string;
  name: string;
  deviceCode: string;
}

interface Dealer {
  id: string;
  name: string;
}

interface RepairModalProps {
  deviceId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function RepairModal({ deviceId, onClose, onSaved }: RepairModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [form, setForm] = useState({
    deviceId: deviceId ?? "",
    reportedBy: "",
    reportedAt: new Date().toISOString().split("T")[0],
    symptom: "",
    cause: "",
    dealerId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!deviceId) {
      fetch("/api/devices").then((r) => r.json()).then(setDevices);
    }
  }, [deviceId]);

  useEffect(() => {
    fetch("/api/dealers").then((r) => r.json()).then((d) => setDealers(Array.isArray(d) ? d : []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    onSaved();
    onClose();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">故障を報告</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!deviceId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">機器 *</label>
              <select
                value={form.deviceId}
                onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">機器を選択...</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.deviceCode} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">報告者 *</label>
              <input
                type="text"
                value={form.reportedBy}
                onChange={(e) => setForm((f) => ({ ...f, reportedBy: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">報告日 *</label>
              <input
                type="date"
                value={form.reportedAt}
                onChange={(e) => setForm((f) => ({ ...f, reportedAt: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">症状・不具合内容 *</label>
            <textarea
              value={form.symptom}
              onChange={(e) => setForm((f) => ({ ...f, symptom: e.target.value }))}
              required
              rows={3}
              placeholder="発生した症状を詳しく記入してください"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">推定原因</label>
            <input
              type="text"
              value={form.cause}
              onChange={(e) => setForm((f) => ({ ...f, cause: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">代理店（修理業者）</label>
            <select
              value={form.dealerId}
              onChange={(e) => setForm((f) => ({ ...f, dealerId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">代理店を選択...</option>
              {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "報告中..." : "故障を報告"}
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
