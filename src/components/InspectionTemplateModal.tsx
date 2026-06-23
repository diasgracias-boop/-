"use client";

import { useEffect, useState } from "react";

const CATEGORIES = ["外装・機能点検", "性能点検", "電気的安全性点検"] as const;
type Category = typeof CATEGORIES[number];

interface TemplateItem {
  name: string;
  category: Category;
  lowerLimit: string;
  upperLimit: string;
}

interface Template {
  id: string;
  name: string;
  items: { id: string; name: string; category: string; lowerLimit: number | null; upperLimit: number | null }[];
}

interface Props {
  onClose: () => void;
  onUpdated: () => void;
}

const emptyItem = (category: Category): TemplateItem => ({ name: "", category, lowerLimit: "", upperLimit: "" });

export default function InspectionTemplateModal({ onClose, onUpdated }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [editName, setEditName] = useState("");
  const [editItems, setEditItems] = useState<TemplateItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "edit">("list");

  async function load() {
    const res = await fetch("/api/inspection-templates");
    setTemplates(await res.json());
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setEditName("");
    setEditItems([]);
    setView("edit");
  }

  function openEdit(t: Template) {
    setEditing(t);
    setEditName(t.name);
    setEditItems(
      t.items.map((i) => ({
        name: i.name,
        category: (CATEGORIES.includes(i.category as Category) ? i.category : "外装・機能点検") as Category,
        lowerLimit: i.lowerLimit?.toString() ?? "",
        upperLimit: i.upperLimit?.toString() ?? "",
      }))
    );
    setView("edit");
  }

  async function handleSave() {
    if (!editName.trim()) return;
    setSaving(true);
    const payload = {
      name: editName.trim(),
      items: editItems
        .filter((i) => i.name.trim())
        .map((i, idx) => ({
          name: i.name.trim(),
          category: i.category,
          lowerLimit: i.lowerLimit !== "" ? parseFloat(i.lowerLimit) : null,
          upperLimit: i.upperLimit !== "" ? parseFloat(i.upperLimit) : null,
          sortOrder: idx,
        })),
    };
    if (editing) {
      await fetch(`/api/inspection-templates/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/inspection-templates", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    }
    await load();
    onUpdated();
    setView("list");
    setSaving(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await fetch(`/api/inspection-templates/${id}`, { method: "DELETE" });
    await load();
    onUpdated();
  }

  function addItem(category: Category) {
    setEditItems((prev) => [...prev, emptyItem(category)]);
  }

  function updateItem(index: number, field: keyof TemplateItem, value: string) {
    setEditItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }

  function removeItem(index: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  }

  const inputCls = "w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  const itemsByCategory = (cat: Category) => editItems
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => item.category === cat);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* ヘッダー */}
        <div className="p-5 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
          {view === "edit" && (
            <button onClick={() => setView("list")} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <h2 className="text-base font-semibold text-gray-900 flex-1">
            {view === "list" ? "点検テンプレート管理" : editing ? `編集：${editing.name}` : "新規テンプレート"}
          </h2>
          {view === "list" && (
            <button onClick={openNew} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">
              + 新規作成
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 一覧 */}
        {view === "list" && (
          <div className="flex-1 overflow-y-auto">
            {templates.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                テンプレートがありません。「+ 新規作成」で追加してください。
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{t.name}</div>
                      <div className="flex gap-3 mt-0.5">
                        {CATEGORIES.map((cat) => {
                          const count = t.items.filter((i) => i.category === cat).length;
                          return count > 0 ? (
                            <span key={cat} className="text-xs text-gray-400">{cat}×{count}</span>
                          ) : null;
                        })}
                        {t.items.length === 0 && <span className="text-xs text-gray-400">点検項目なし</span>}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{t.items.length}項目</span>
                    <button onClick={() => openEdit(t)} className="text-xs text-blue-600 hover:underline flex-shrink-0">編集</button>
                    <button onClick={() => handleDelete(t.id, t.name)} className="text-xs text-red-500 hover:underline flex-shrink-0">削除</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 編集 */}
        {view === "edit" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">テンプレート名 *</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="例: 電気安全点検、年次定期点検"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {CATEGORIES.map((cat) => {
              const catItems = itemsByCategory(cat);
              return (
                <div key={cat} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">{cat}</span>
                    <button
                      type="button"
                      onClick={() => addItem(cat)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + 項目を追加
                    </button>
                  </div>
                  {catItems.length > 0 ? (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-xs text-gray-500 font-medium border-b border-gray-100">
                          <th className="text-left px-3 py-1.5">点検項目</th>
                          <th className="text-center px-2 py-1.5 w-24">下限</th>
                          <th className="text-center px-2 py-1.5 w-24">上限</th>
                          <th className="w-6"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {catItems.map(({ item, originalIndex }) => (
                          <tr key={originalIndex}>
                            <td className="px-3 py-1.5">
                              <input type="text" value={item.name} onChange={(e) => updateItem(originalIndex, "name", e.target.value)} placeholder="項目名" className={inputCls} />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={item.lowerLimit} onChange={(e) => updateItem(originalIndex, "lowerLimit", e.target.value)} placeholder="—" step="any" className={inputCls + " text-center"} />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={item.upperLimit} onChange={(e) => updateItem(originalIndex, "upperLimit", e.target.value)} placeholder="—" step="any" className={inputCls + " text-center"} />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button type="button" onClick={() => removeItem(originalIndex)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="px-4 py-3 text-xs text-gray-400">項目がありません。「+ 項目を追加」で追加してください。</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* フッター */}
        {view === "edit" && (
          <div className="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button onClick={() => setView("list")} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">
              キャンセル
            </button>
          </div>
        )}
        {view === "list" && (
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <button onClick={onClose} className="w-full bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">閉じる</button>
          </div>
        )}
      </div>
    </div>
  );
}
