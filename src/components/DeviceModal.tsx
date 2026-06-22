"use client";

import { useState } from "react";
import PmdaSearchModal from "./PmdaSearchModal";
import type { PmdaResult } from "@/app/api/pmda/search/route";

interface DeviceFormData {
  deviceCode: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  ref: string;
  dealer: string;
  department: string;
  serialNumber: string;
  location: string;
  purchaseDate: string;
  usefulLifeYears: string;
  price: string;
  endOfSaleDate: string;
  endOfServiceDate: string;
  warrantyExpiry: string;
  status: string;
  disposalStatus: string;
  disposalDate: string;
  inactiveDate: string;
  notes: string;
  inspectionNotes: string;
  inspectionIntervalMonths: string;
  batteryReplacementIntervalYears: string;
  lastBatteryReplacementDate: string;
  consumableName: string;
  lastConsumableReplacementDate: string;
  lastConsumableSpareReplacementDate: string;
  isCleanField: boolean;
  cleanFieldCategory: string;
  photoUrl: string;
}

interface DeviceModalProps {
  device?: Partial<DeviceFormData> & { id: string } | null;
  onClose: () => void;
  onSaved: () => void;
}

function toDateInput(d?: string | null) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

const TABS = ["基本情報", "点検・バッテリー", "廃棄・その他"] as const;
type Tab = (typeof TABS)[number];

export default function DeviceModal({ device, onClose, onSaved }: DeviceModalProps) {
  const [tab, setTab] = useState<Tab>("基本情報");
  const [form, setForm] = useState<DeviceFormData>({
    deviceCode: device?.deviceCode ?? "",
    name: device?.name ?? "",
    category: device?.category ?? "",
    manufacturer: device?.manufacturer ?? "",
    model: device?.model ?? "",
    ref: device?.ref ?? "",
    dealer: device?.dealer ?? "",
    department: device?.department ?? "",
    serialNumber: device?.serialNumber ?? "",
    location: device?.location ?? "",
    purchaseDate: toDateInput(device?.purchaseDate),
    usefulLifeYears: device?.usefulLifeYears ?? "",
    price: device?.price ?? "",
    endOfSaleDate: toDateInput(device?.endOfSaleDate),
    endOfServiceDate: toDateInput(device?.endOfServiceDate),
    warrantyExpiry: toDateInput(device?.warrantyExpiry),
    status: device?.status ?? "ACTIVE",
    disposalStatus: device?.disposalStatus ?? "",
    disposalDate: toDateInput(device?.disposalDate),
    inactiveDate: toDateInput(device?.inactiveDate),
    notes: device?.notes ?? "",
    inspectionNotes: device?.inspectionNotes ?? "",
    inspectionIntervalMonths: device?.inspectionIntervalMonths ?? "",
    batteryReplacementIntervalYears: device?.batteryReplacementIntervalYears ?? "",
    lastBatteryReplacementDate: toDateInput(device?.lastBatteryReplacementDate),
    consumableName: device?.consumableName ?? "",
    lastConsumableReplacementDate: toDateInput(device?.lastConsumableReplacementDate),
    lastConsumableSpareReplacementDate: toDateInput(device?.lastConsumableSpareReplacementDate),
    isCleanField: device?.isCleanField ?? false,
    cleanFieldCategory: device?.cleanFieldCategory ?? "",
    photoUrl: device?.photoUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPmda, setShowPmda] = useState(false);

  function applyPmdaResult(r: PmdaResult) {
    setForm((f) => ({
      ...f,
      name: r.name || f.name,
      manufacturer: r.manufacturer || f.manufacturer,
      photoUrl: r.pdfUrl,
    }));
  }

  function update<K extends keyof DeviceFormData>(key: K, value: DeviceFormData[K]) {
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

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {device ? "機器情報を編集" : "新規機器登録"}
          </h2>
          <button
            type="button"
            onClick={() => setShowPmda(true)}
            className="flex items-center gap-1.5 text-xs bg-green-50 border border-green-300 text-green-700 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-colors font-medium"
          >
            📄 PMDAから添付文書を取得
          </button>
        </div>

        {showPmda && (
          <PmdaSearchModal
            initialName={form.name}
            initialManufacturer={form.manufacturer}
            onSelect={applyPmdaResult}
            onClose={() => setShowPmda(false)}
          />
        )}

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 px-6">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* ===== 基本情報 ===== */}
          {tab === "基本情報" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>SN（シリアル番号）</label>
                  <input type="text" value={form.serialNumber} onChange={(e) => update("serialNumber", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>機器コード *</label>
                  <input type="text" value={form.deviceCode} onChange={(e) => update("deviceCode", e.target.value)} required className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>名称 *</label>
                  <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>分類（カテゴリ）*</label>
                  <input type="text" value={form.category} onChange={(e) => update("category", e.target.value)} required placeholder="例: 血圧計、輸液ポンプ" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>REF</label>
                  <input type="text" value={form.ref} onChange={(e) => update("ref", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>メーカー *</label>
                  <input type="text" value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} required className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>代理店</label>
                  <input type="text" value={form.dealer} onChange={(e) => update("dealer", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>モデル *</label>
                  <input type="text" value={form.model} onChange={(e) => update("model", e.target.value)} required className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>配備部署</label>
                  <input type="text" value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="例: リハビリ" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>所在地 *</label>
                  <input type="text" value={form.location} onChange={(e) => update("location", e.target.value)} required placeholder="例: 第3リハ" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>購入日</label>
                  <input type="date" value={form.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>耐用年数（年）</label>
                  <input type="number" min="0" value={form.usefulLifeYears} onChange={(e) => update("usefulLifeYears", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>価格</label>
                  <input type="number" min="0" value={form.price} onChange={(e) => update("price", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>販売終了日</label>
                  <input type="date" value={form.endOfSaleDate} onChange={(e) => update("endOfSaleDate", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>サービスエンド日</label>
                  <input type="date" value={form.endOfServiceDate} onChange={(e) => update("endOfServiceDate", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>ステータス</label>
                  <select value={form.status} onChange={(e) => update("status", e.target.value)} className={inputCls}>
                    <option value="ACTIVE">稼働中</option>
                    <option value="MAINTENANCE">保守中</option>
                    <option value="REPAIR">修理中</option>
                    <option value="RETIRED">廃棄</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>保証期限</label>
                  <input type="date" value={form.warrantyExpiry} onChange={(e) => update("warrantyExpiry", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>備考</label>
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className={inputCls} />
              </div>
            </>
          )}

          {/* ===== 点検・バッテリー ===== */}
          {tab === "点検・バッテリー" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>点検間隔（ヶ月）</label>
                  <input type="number" min="0" value={form.inspectionIntervalMonths} onChange={(e) => update("inspectionIntervalMonths", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>点検備考</label>
                <textarea value={form.inspectionNotes} onChange={(e) => update("inspectionNotes", e.target.value)} rows={3} className={inputCls} />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">バッテリー管理</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>バッテリー交換周期（年）</label>
                    <input type="number" min="0" value={form.batteryReplacementIntervalYears} onChange={(e) => update("batteryReplacementIntervalYears", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>バッテリー交換実施日</label>
                    <input type="date" value={form.lastBatteryReplacementDate} onChange={(e) => update("lastBatteryReplacementDate", e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">消耗品管理</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>消耗品名称</label>
                    <input type="text" value={form.consumableName} onChange={(e) => update("consumableName", e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className={labelCls}>消耗品交換実施日</label>
                    <input type="date" value={form.lastConsumableReplacementDate} onChange={(e) => update("lastConsumableReplacementDate", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>消耗品（予備）交換実施日</label>
                    <input type="date" value={form.lastConsumableSpareReplacementDate} onChange={(e) => update("lastConsumableSpareReplacementDate", e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===== 廃棄・その他 ===== */}
          {tab === "廃棄・その他" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>廃棄/未稼働</label>
                  <select value={form.disposalStatus} onChange={(e) => update("disposalStatus", e.target.value)} className={inputCls}>
                    <option value="">-</option>
                    <option value="DISPOSED">廃棄</option>
                    <option value="INACTIVE">未稼働</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>廃棄日</label>
                  <input type="date" value={form.disposalDate} onChange={(e) => update("disposalDate", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>未稼働日</label>
                  <input type="date" value={form.inactiveDate} onChange={(e) => update("inactiveDate", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">清潔野機器</h3>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="isCleanField"
                    checked={form.isCleanField}
                    onChange={(e) => update("isCleanField", e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isCleanField" className="text-sm font-medium text-gray-700">清潔野機器</label>
                </div>
                {form.isCleanField && (
                  <div>
                    <label className={labelCls}>清潔野機器分類</label>
                    <input type="text" value={form.cleanFieldCategory} onChange={(e) => update("cleanFieldCategory", e.target.value)} className={inputCls} />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className={labelCls}>写真URL</label>
                <input type="url" value={form.photoUrl} onChange={(e) => update("photoUrl", e.target.value)} placeholder="https://..." className={inputCls} />
                {form.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.photoUrl} alt="機器写真" className="mt-2 h-32 object-contain rounded border border-gray-200" />
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-200">
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
