"use client";

import { useState } from "react";

interface DeviceFormData {
  deviceCode: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  purchaseDate: string;
  warrantyExpiry: string;
  status: string;
  notes: string;
}

interface DeviceModalProps {
  device?: {
    id: string;
    deviceCode: string;
    name: string;
    category: string;
    manufacturer: string;
    model: string;
    serialNumber?: string;
    location: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    status: string;
    notes?: string;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

function toDateInput(d?: string) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export default function DeviceModal({ device, onClose, onSaved }: DeviceModalProps) {
  const [form, setForm] = useState<DeviceFormData>({
    deviceCode: device?.deviceCode ?? "",
    name: device?.name ?? "",
    category: device?.category ?? "",
    manufacturer: device?.manufacturer ?? "",
    model: device?.model ?? "",
    serialNumber: device?.serialNumber ?? "",
    location: device?.location ?? "",
    purchaseDate: toDateInput(device?.purchaseDate),
    warrantyExpiry: toDateInput(device?.warrantyExpiry),
    status: device?.status ?? "ACTIVE",
    notes: device?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof DeviceFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = device ? `/api/devices/${device.id}` : "/api/devices";
    const method = device ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "保存に失敗しました");
    } else {
      onSaved();
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {device ? "機器情報を編集" : "新規機器登録"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">機器コード *</label>
              <input
                type="text"
                value={form.deviceCode}
                onChange={(e) => update("deviceCode", e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">機器名 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ *</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                required
                placeholder="例: 診断機器、治療機器"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">設置場所 *</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                required
                placeholder="例: 3F 内科病棟"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メーカー *</label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => update("manufacturer", e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">モデル *</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">シリアル番号</label>
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => update("serialNumber", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">稼働中</option>
                <option value="MAINTENANCE">保守中</option>
                <option value="REPAIR">修理中</option>
                <option value="RETIRED">廃棄</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">購入日</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => update("purchaseDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">保証期限</label>
              <input
                type="date"
                value={form.warrantyExpiry}
                onChange={(e) => update("warrantyExpiry", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "保存中..." : "保存"}
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
