"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DeviceModal from "@/components/DeviceModal";
import RepairModal from "@/components/RepairModal";

interface Device {
  id: string;
  deviceCode: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  location: string;
  status: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  pmdaUpdateAvailable?: boolean;
  _count: { maintenanceLogs: number; repairLogs: number };
  inspectionSchedules: Array<{ scheduledAt: string }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "稼働中", color: "bg-green-100 text-green-700" },
  MAINTENANCE: { label: "保守中", color: "bg-blue-100 text-blue-700" },
  REPAIR: { label: "修理中", color: "bg-orange-100 text-orange-700" },
  RETIRED: { label: "廃棄", color: "bg-gray-100 text-gray-500" },
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ja-JP");
}

export default function DevicesPage() {
  const searchParams = useSearchParams();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [showModal, setShowModal] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [repairDeviceId, setRepairDeviceId] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/devices?${params}`);
    const data = await res.json();
    setDevices(data);
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  function handleEdit(device: Device) {
    setEditDevice(device);
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("この機器を削除しますか？関連する履歴も全て削除されます。")) return;
    await fetch(`/api/devices/${id}`, { method: "DELETE" });
    fetchDevices();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">機器台帳</h1>
        <button
          onClick={() => { setEditDevice(null); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 機器を登録
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-4 p-4 flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="機器名・コード・メーカーで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">すべてのステータス</option>
          <option value="ACTIVE">稼働中</option>
          <option value="MAINTENANCE">保守中</option>
          <option value="REPAIR">修理中</option>
          <option value="RETIRED">廃棄</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center text-gray-400">機器が見つかりません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">機器コード</th>
                <th className="px-4 py-3">機器名</th>
                <th className="px-4 py-3">カテゴリ</th>
                <th className="px-4 py-3">メーカー / モデル</th>
                <th className="px-4 py-3">設置場所</th>
                <th className="px-4 py-3">ステータス</th>
                <th className="px-4 py-3">次回点検</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devices.map((d) => {
                const st = statusConfig[d.status] ?? { label: d.status, color: "bg-gray-100 text-gray-600" };
                const nextInspection = d.inspectionSchedules[0];
                const isOverdue = nextInspection && new Date(nextInspection.scheduledAt) < new Date();
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.deviceCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/devices/${d.id}`} className="hover:text-blue-600 hover:underline">
                          {d.name}
                        </Link>
                        {d.pmdaUpdateAvailable && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">添付文書更新</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.category}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{d.manufacturer}</div>
                      <div className="text-xs text-gray-400">{d.model}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.location}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {nextInspection ? (
                        <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                          {isOverdue && "⚠ "}
                          {formatDate(nextInspection.scheduledAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">未設定</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(d)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => setRepairDeviceId(d.id)}
                          className="text-xs text-orange-600 hover:underline"
                        >
                          修理登録
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <DeviceModal
          device={editDevice}
          onClose={() => setShowModal(false)}
          onSaved={fetchDevices}
        />
      )}

      {repairDeviceId && (
        <RepairModal
          deviceId={repairDeviceId}
          onClose={() => setRepairDeviceId(null)}
          onSaved={fetchDevices}
        />
      )}
    </div>
  );
}
