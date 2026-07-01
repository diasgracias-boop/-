"use client";

import { useCallback, useEffect, useState } from "react";
import PmdaSearchModal from "./PmdaSearchModal";
import DocumentUpload from "./DocumentUpload";
import RepairModal from "./RepairModal";
import InspectionModal from "./InspectionModal";
import RepairTimeline, { RepairStatusLogEntry } from "./RepairTimeline";
import type { PmdaResult } from "@/app/api/pmda/search/route";

type DocField = "attachmentUrl" | "catalogUrl" | "manualUrl";

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
  cleanFieldDefaultCount: string;
  cleanFieldCurrentCount: string;
  cleanFieldSubstituteCount: string;
  photoUrl: string;
  attachmentUrl: string;
  catalogUrl: string;
  manualUrl: string;
  pmdaApprovalNumber: string;
  pmdaDocUpdatedAt: string;
}

interface DeviceWithItems extends Partial<DeviceFormData> {
  id: string;
}

interface DeviceModalProps {
  device?: DeviceWithItems | null;
  onClose: () => void;
  onSaved: () => void;
}

function toDateInput(d?: string | null) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

const TABS = ["基本情報", "点検・バッテリー", "定期点検", "修理履歴", "廃棄・その他"] as const;
type Tab = (typeof TABS)[number];

const REPAIR_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN: { label: "未対応", color: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "対応中", color: "bg-yellow-100 text-yellow-700" },
  RESOLVED: { label: "解決済", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "完了", color: "bg-gray-100 text-gray-600" },
};

interface RepairLogForModal {
  id: string;
  reportedBy: string;
  reportedAt: string;
  symptom: string;
  cause: string | null;
  action: string | null;
  resolvedAt: string | null;
  status: string;
  cost: number | null;
  vendor: string | null;
  statusLogs?: RepairStatusLogEntry[];
}

interface InspectionScheduleForModal {
  id: string;
  scheduledAt: string;
  intervalDays: number;
  description: string;
  completed: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  items: { id: string; name: string; category?: string; lowerLimit: number | null; upperLimit: number | null; measuredValue: number | null; judgment: string | null }[];
}

interface InspectionMeasurement {
  id: string;
  measuredValue: string;
  judgment: string;
}

function autoJudge(value: string, lower: number | null, upper: number | null): string {
  const v = parseFloat(value);
  if (isNaN(v)) return "";
  if (lower !== null && v < lower) return "NG";
  if (upper !== null && v > upper) return "NG";
  return "OK";
}

const INSP_CATS = ["外装・機能点検", "性能点検", "電気的安全性点検"] as const;

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
    cleanFieldDefaultCount: device?.cleanFieldDefaultCount != null ? String(device.cleanFieldDefaultCount) : "",
    cleanFieldCurrentCount: device?.cleanFieldCurrentCount != null ? String(device.cleanFieldCurrentCount) : "",
    cleanFieldSubstituteCount: device?.cleanFieldSubstituteCount != null ? String(device.cleanFieldSubstituteCount) : "",
    photoUrl: device?.photoUrl ?? "",
    attachmentUrl: device?.attachmentUrl ?? "",
    catalogUrl: device?.catalogUrl ?? "",
    manualUrl: device?.manualUrl ?? "",
    pmdaApprovalNumber: device?.pmdaApprovalNumber ?? "",
    pmdaDocUpdatedAt: device?.pmdaDocUpdatedAt ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pmdaTarget, setPmdaTarget] = useState<DocField | null>(null);

  // 定期点検タブ用 state
  const [schedules, setSchedules] = useState<InspectionScheduleForModal[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [inspCompletedAt, setInspCompletedAt] = useState("");
  const [inspCompletedBy, setInspCompletedBy] = useState("");
  const [inspMeasurements, setInspMeasurements] = useState<InspectionMeasurement[]>([]);
  const [inspSaving, setInspSaving] = useState(false);
  const [inspLoadingItems, setInspLoadingItems] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);

  // 修理履歴タブ用 state
  const [repairs, setRepairs] = useState<RepairLogForModal[]>([]);
  const [repairsLoading, setRepairsLoading] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);

  const loadRepairs = useCallback(async () => {
    if (!device?.id) return;
    setRepairsLoading(true);
    const res = await fetch(`/api/repairs?deviceId=${device.id}`);
    const data: RepairLogForModal[] = await res.json();
    setRepairs(data);
    setRepairsLoading(false);
  }, [device?.id]);

  useEffect(() => {
    if (tab === "修理履歴") loadRepairs();
  }, [tab, loadRepairs]);

  const loadSchedules = useCallback(async () => {
    if (!device?.id) return;
    setSchedulesLoading(true);
    const res = await fetch(`/api/inspections?deviceId=${device.id}`);
    const data: InspectionScheduleForModal[] = await res.json();
    setSchedules(data);
    setSchedulesLoading(false);
  }, [device?.id]);

  useEffect(() => {
    if (tab === "定期点検") loadSchedules();
  }, [tab, loadSchedules]);

  async function openScheduleForComplete(schedule: InspectionScheduleForModal) {
    setActiveScheduleId(schedule.id);
    setInspCompletedAt(new Date().toISOString().split("T")[0]);
    setInspCompletedBy("");
    setInspLoadingItems(true);
    // 項目がなければ populate-items で自動生成
    let items = schedule.items;
    if (items.length === 0) {
      const res = await fetch(`/api/inspections/${schedule.id}/populate-items`, { method: "POST" });
      items = await res.json();
      setSchedules((prev) => prev.map((s) => s.id === schedule.id ? { ...s, items } : s));
    }
    setInspMeasurements(items.map((it) => ({ id: it.id, measuredValue: it.measuredValue?.toString() ?? "", judgment: it.judgment ?? "" })));
    setInspLoadingItems(false);
  }

  function updateInspMeasurement(index: number, field: "measuredValue" | "judgment", value: string) {
    setInspMeasurements((prev) => prev.map((m, i) => {
      if (i !== index) return m;
      const updated = { ...m, [field]: value };
      if (field === "measuredValue") {
        const s = schedules.find((s) => s.id === activeScheduleId);
        if (s) {
          const item = s.items[index];
          updated.judgment = autoJudge(value, item.lowerLimit, item.upperLimit);
        }
      }
      return updated;
    }));
  }

  async function submitInspection() {
    if (!activeScheduleId) return;
    setInspSaving(true);
    const payload = {
      completedBy: inspCompletedBy || undefined,
      completedAt: inspCompletedAt || undefined,
      measurements: inspMeasurements.map((m) => ({
        id: m.id,
        measuredValue: m.measuredValue !== "" ? parseFloat(m.measuredValue) : undefined,
        judgment: m.judgment || undefined,
      })),
    };
    await fetch(`/api/inspections/${activeScheduleId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActiveScheduleId(null);
    setInspSaving(false);
    loadSchedules();
  }

  function applyPmdaResult(r: PmdaResult) {
    if (!pmdaTarget) return;
    setForm((f) => ({
      ...f,
      name: r.name || f.name,
      manufacturer: r.manufacturer || f.manufacturer,
      [pmdaTarget]: r.pdfUrl,
      // Only track PMDA metadata when attaching the main 添付文書
      ...(pmdaTarget === "attachmentUrl" ? {
        pmdaApprovalNumber: r.approvalNumber || f.pmdaApprovalNumber,
        pmdaDocUpdatedAt: r.updatedAt || f.pmdaDocUpdatedAt,
      } : {}),
    }));
  }

  function openPmda(field: DocField) {
    setPmdaTarget(field);
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
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {device ? "機器情報を編集" : "新規機器登録"}
          </h2>
        </div>

        {pmdaTarget && (
          <PmdaSearchModal
            initialName={form.name}
            initialManufacturer={form.manufacturer}
            onSelect={applyPmdaResult}
            onClose={() => setPmdaTarget(null)}
          />
        )}

        {showRepairModal && device?.id && (
          <RepairModal
            deviceId={device.id}
            onClose={() => setShowRepairModal(false)}
            onSaved={loadRepairs}
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

          {/* ===== 定期点検 ===== */}
          {tab === "定期点検" && (
            <div className="p-6 space-y-4">
              {!device?.id ? (
                <p className="text-sm text-gray-500">機器を保存してから点検を登録してください。</p>
              ) : (
              <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddSchedule(true)}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  + 点検予定を追加
                </button>
              </div>
              {schedulesLoading ? (
                <p className="text-sm text-gray-400">読み込み中...</p>
              ) : schedules.length === 0 ? (
                <p className="text-sm text-gray-500">点検スケジュールがありません。上の「点検予定を追加」から登録してください。</p>
              ) : (
                <div className="space-y-3">
                  {schedules.filter((s) => !s.completed).map((s) => {
                    const isActive = activeScheduleId === s.id;
                    const days = Math.ceil((new Date(s.scheduledAt).getTime() - Date.now()) / 86400000);
                    const isOverdue = days < 0;
                    const ngCount = inspMeasurements.filter((m) => m.judgment === "NG").length;
                    return (
                      <div key={s.id} className={`border rounded-xl overflow-hidden ${s.completed ? "border-gray-200 opacity-60" : isOverdue ? "border-red-300" : "border-gray-200"}`}>
                        {/* スケジュールヘッダー */}
                        <div
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer ${s.completed ? "bg-gray-50" : isActive ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          onClick={() => { if (!s.completed) isActive ? setActiveScheduleId(null) : openScheduleForComplete(s); }}
                        >
                          <div className="flex items-center gap-3">
                            {s.completed ? (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">完了済</span>
                            ) : isOverdue ? (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">期限超過</span>
                            ) : (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">予定</span>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{s.description}</div>
                              <div className="text-xs text-gray-500">
                                予定日: {new Date(s.scheduledAt).toLocaleDateString("ja-JP")}
                                {s.completed && s.completedAt && (
                                  <> ／ 実施日: {new Date(s.completedAt).toLocaleDateString("ja-JP")}
                                  {s.completedBy && ` ／ 点検者: ${s.completedBy}`}</>
                                )}
                                {!s.completed && !isOverdue && <> ／ あと{days}日</>}
                                {!s.completed && isOverdue && <> ／ {Math.abs(days)}日超過</>}
                              </div>
                            </div>
                          </div>
                          {!s.completed && (
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isActive ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          )}
                        </div>

                        {/* 入力エリア */}
                        {isActive && (
                          <div className="border-t border-gray-200 p-4 space-y-4">
                            {/* 点検日・点検者 */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">点検日 *</label>
                                <input
                                  type="date"
                                  value={inspCompletedAt}
                                  onChange={(e) => setInspCompletedAt(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">点検者</label>
                                <input
                                  type="text"
                                  value={inspCompletedBy}
                                  onChange={(e) => setInspCompletedBy(e.target.value)}
                                  placeholder="氏名・部署など"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            {/* 点検項目テーブル */}
                            {inspLoadingItems ? (
                              <p className="text-xs text-gray-400">点検項目を読み込み中...</p>
                            ) : s.items.length === 0 ? (
                              <p className="text-xs text-gray-400">点検項目がありません。</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                  <thead className="sticky top-0 bg-white">
                                    <tr className="text-xs text-gray-500 font-medium border-b border-gray-200">
                                      <th className="text-left px-2 py-1.5">点検項目</th>
                                      <th className="text-center px-2 py-1.5 w-20">
                                        <div className="flex items-center justify-center gap-1">
                                          <span>判定</span>
                                          <button
                                            type="button"
                                            onClick={() => setInspMeasurements((prev) => prev.map((m) => ({ ...m, judgment: m.judgment === "" ? "OK" : m.judgment })))}
                                            className="text-[10px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-medium hover:bg-green-200"
                                          >全OK</button>
                                        </div>
                                      </th>
                                      <th className="text-center px-2 py-1.5 w-24">測定値</th>
                                      <th className="text-center px-2 py-1.5 w-14">上限</th>
                                      <th className="text-center px-2 py-1.5 w-14">下限</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(() => {
                                      const rows: React.ReactNode[] = [];
                                      let lastCat: string | null = null;
                                      s.items.forEach((item, idx) => {
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
                                        const m = inspMeasurements[idx];
                                        if (!m) return;
                                        const isNg = m.judgment === "NG";
                                        const isOk = m.judgment === "OK";
                                        rows.push(
                                          <tr key={item.id} className={`border-t border-gray-100 ${isNg ? "bg-red-50" : isOk ? "bg-green-50/40" : ""}`}>
                                            <td className="px-2 py-1 text-gray-800 font-medium text-xs">{item.name}</td>
                                            <td className="px-2 py-1">
                                              <select
                                                value={m.judgment}
                                                onChange={(e) => updateInspMeasurement(idx, "judgment", e.target.value)}
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
                                                onChange={(e) => updateInspMeasurement(idx, "measuredValue", e.target.value)}
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

                            {/* 送信ボタン */}
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={submitInspection}
                                disabled={inspSaving || !inspCompletedAt}
                                className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {inspSaving ? "保存中..." : `点検完了として保存${ngCount > 0 ? `（NG ${ngCount}件）` : ""}`}
                              </button>
                              <button type="button" onClick={() => setActiveScheduleId(null)} className="px-4 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">
                                キャンセル
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {schedules.filter((s) => !s.completed).length === 0 && (
                    <p className="text-sm text-gray-500">予定されている点検はありません。</p>
                  )}

                  {/* 過去の点検一覧 */}
                  {schedules.some((s) => s.completed) && (
                    <div className="pt-4 mt-2 border-t border-gray-200 space-y-2">
                      <h3 className="text-sm font-semibold text-gray-700">過去の点検一覧</h3>
                      {schedules
                        .filter((s) => s.completed)
                        .sort((a, b) => new Date(b.completedAt ?? b.scheduledAt).getTime() - new Date(a.completedAt ?? a.scheduledAt).getTime())
                        .map((s) => {
                          const ng = s.items.filter((it) => it.judgment === "NG").length;
                          return (
                            <div key={s.id} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                              <div className="flex items-center gap-3">
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">完了済</span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{s.description}</div>
                                  <div className="text-xs text-gray-500">
                                    実施日: {new Date(s.completedAt ?? s.scheduledAt).toLocaleDateString("ja-JP")}
                                    {s.completedBy && ` ／ 点検者: ${s.completedBy}`}
                                    {` ／ 予定日: ${new Date(s.scheduledAt).toLocaleDateString("ja-JP")}`}
                                  </div>
                                </div>
                              </div>
                              {ng > 0 && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">NG {ng}件</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
              {showAddSchedule && device?.id && (
                <InspectionModal
                  deviceId={device.id}
                  onClose={() => setShowAddSchedule(false)}
                  onSaved={loadSchedules}
                />
              )}
              </>
              )}
            </div>
          )}

          {/* ===== 修理履歴 ===== */}
          {tab === "修理履歴" && (
            <div className="space-y-3">
              {!device?.id ? (
                <p className="text-sm text-gray-500">機器を保存してから修理履歴を確認できます。</p>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowRepairModal(true)}
                      className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      + 故障を報告
                    </button>
                  </div>
                  {repairsLoading ? (
                    <p className="text-sm text-gray-400">読み込み中...</p>
                  ) : repairs.length === 0 ? (
                    <p className="text-sm text-gray-500">この機器の修理・故障履歴はありません。</p>
                  ) : (
                    repairs.map((r) => {
                  const st = REPAIR_STATUS_CONFIG[r.status] ?? { label: r.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <div key={r.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                        <span className="text-xs text-gray-500">
                          報告日: {new Date(r.reportedAt).toLocaleDateString("ja-JP")}
                          {r.resolvedAt && ` ／ 解決日: ${new Date(r.resolvedAt).toLocaleDateString("ja-JP")}`}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">{r.symptom}</div>
                      <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
                        {r.cause && <div><span className="text-gray-400">原因: </span>{r.cause}</div>}
                        {r.action && <div><span className="text-gray-400">対応: </span>{r.action}</div>}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-gray-500">
                          <span>報告者: {r.reportedBy}</span>
                          {r.vendor && <span>業者: {r.vendor}</span>}
                          {r.cost != null && <span>費用: ¥{r.cost.toLocaleString()}</span>}
                        </div>
                      </div>
                      {r.statusLogs && r.statusLogs.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <RepairTimeline logs={r.statusLogs} currentStatus={r.status} />
                        </div>
                      )}
                    </div>
                  );
                    })
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== 廃棄・その他 ===== */}
          {tab === "廃棄・その他" && (
            <>
              {/* 書類セクション */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">添付書類</h3>
                <div className="grid grid-cols-3 gap-4">
                  {(
                    [
                      { field: "attachmentUrl" as DocField, label: "添付文書", icon: "📄" },
                      { field: "catalogUrl"    as DocField, label: "カタログ",  icon: "📋" },
                      { field: "manualUrl"     as DocField, label: "取扱説明書", icon: "📖" },
                    ] as const
                  ).map(({ field, label, icon }) => (
                    <DocumentUpload
                      key={field}
                      label={label}
                      icon={icon}
                      value={form[field]}
                      onChange={(url) => update(field, url)}
                      onPmdaClick={() => openPmda(field)}
                      deviceInfo={{ name: form.name, model: form.model, manufacturer: form.manufacturer }}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className={labelCls}>写真URL</label>
                <input type="url" value={form.photoUrl} onChange={(e) => update("photoUrl", e.target.value)} placeholder="https://..." className={inputCls} />
                {form.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.photoUrl} alt="機器写真" className="mt-2 h-32 object-contain rounded border border-gray-200" />
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>廃棄/未稼働</label>
                  <select value={form.disposalStatus} onChange={(e) => update("disposalStatus", e.target.value)} className={inputCls}>
                    <option value="">-</option>
                    <option value="DISPOSED">廃棄</option>
                    <option value="INACTIVE">未稼働</option>
                  </select>
                </div>
              </div>
              {form.disposalStatus && (
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
              )}

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
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>清潔野機器分類</label>
                      <input type="text" value={form.cleanFieldCategory} onChange={(e) => update("cleanFieldCategory", e.target.value)} className={inputCls} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>既定定数</label>
                        <input type="number" min="0" value={form.cleanFieldDefaultCount} onChange={(e) => update("cleanFieldDefaultCount", e.target.value)} className={inputCls} placeholder="—" />
                      </div>
                      <div>
                        <label className={labelCls}>現在定数</label>
                        <input type="number" min="0" value={form.cleanFieldCurrentCount} onChange={(e) => update("cleanFieldCurrentCount", e.target.value)} className={inputCls} placeholder="—" />
                      </div>
                      <div>
                        <label className={labelCls}>代品数</label>
                        <input type="number" min="0" value={form.cleanFieldSubstituteCount} onChange={(e) => update("cleanFieldSubstituteCount", e.target.value)} className={inputCls} placeholder="—" />
                      </div>
                    </div>
                  </div>
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
