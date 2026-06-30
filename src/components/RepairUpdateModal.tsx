"use client";

import { useEffect, useState } from "react";
import { ME_STAFF } from "@/lib/constants";
import RepairTimeline, { RepairStatusLogEntry } from "./RepairTimeline";

interface Dealer {
  id: string;
  name: string;
}

interface RepairUpdateModalProps {
  repair: {
    id: string;
    status: string;
    cause?: string;
    action?: string;
    cost?: number;
    vendor?: string;
    dealerId?: string | null;
    device: { name: string };
    statusLogs?: RepairStatusLogEntry[];
  };
  onClose: () => void;
  onSaved: () => void;
}

export default function RepairUpdateModal({ repair, onClose, onSaved }: RepairUpdateModalProps) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [form, setForm] = useState({
    status: repair.status,
    changedBy: "",
    note: "",
    cause: repair.cause ?? "",
    action: repair.action ?? "",
    cost: repair.cost?.toString() ?? "",
    dealerId: repair.dealerId ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/dealers").then((r) => r.json()).then((d) => setDealers(Array.isArray(d) ? d : []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/repairs/${repair.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    onSaved();
    onClose();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">修理状況を更新</h2>
          <p className="text-sm text-gray-500 mt-1">{repair.device.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {repair.statusLogs && repair.statusLogs.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <RepairTimeline logs={repair.statusLogs} currentStatus={repair.status} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス *</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="OPEN">未対応</option>
                <option value="IN_PROGRESS">対応中</option>
                <option value="RESOLVED">解決済</option>
                <option value="CLOSED">完了</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">対応者 *</label>
              <select
                value={form.changedBy}
                onChange={(e) => setForm((f) => ({ ...f, changedBy: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">担当者を選択...</option>
                {ME_STAFF.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">対応コメント</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="例: メーカーに保守依頼、基板交換完了 など"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">原因</label>
            <textarea
              value={form.cause}
              onChange={(e) => setForm((f) => ({ ...f, cause: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">対応内容</label>
            <textarea
              value={form.action}
              onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">修理費用（円）</label>
              <input
                type="number"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
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
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "更新中..." : "更新"}
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
