"use client";

import { useEffect, useState } from "react";

interface Device {
  id: string;
  name: string;
  deviceCode: string;
}

interface MaintenanceModalProps {
  deviceId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function MaintenanceModal({ deviceId, onClose, onSaved }: MaintenanceModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState({
    deviceId: deviceId ?? "",
    performedBy: "",
    performedAt: new Date().toISOString().split("T")[0],
    type: "INSPECTION",
    description: "",
    result: "",
    nextSchedule: "",
    intervalDays: "365",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!deviceId) {
      fetch("/api/devices").then((r) => r.json()).then(setDevices);
    }
  }, [deviceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/maintenance", {
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
          <h2 className="text-lg font-semibold text-gray-900">保守記録を追加</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">実施者 *</label>
              <input
                type="text"
                value={form.performedBy}
                onChange={(e) => setForm((f) => ({ ...f, performedBy: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">実施日 *</label>
              <input
                type="date"
                value={form.performedAt}
                onChange={(e) => setForm((f) => ({ ...f, performedAt: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">種別 *</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="INSPECTION">点検</option>
              <option value="CALIBRATION">校正</option>
              <option value="CLEANING">清掃</option>
              <option value="PREVENTIVE">予防保守</option>
              <option value="OTHER">その他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">実施内容 *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">結果</label>
            <textarea
              value={form.result}
              onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">次回点検予定日</label>
              <input
                type="date"
                value={form.nextSchedule}
                onChange={(e) => setForm((f) => ({ ...f, nextSchedule: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">次回点検周期</label>
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
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
