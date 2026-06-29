"use client";

import { useEffect, useState, useCallback } from "react";

interface Dealer {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
}

const EMPTY = { name: "", contactPerson: "", phone: "", email: "" };

export default function DealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Dealer | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dealers");
      const data = await res.json();
      setDealers(Array.isArray(data) ? data : []);
    } catch {
      setDealers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDealers(); }, [fetchDealers]);

  function openNew() {
    setEditTarget(null);
    setForm(EMPTY);
    setError("");
    setShowModal(true);
  }

  function openEdit(d: Dealer) {
    setEditTarget(d);
    setForm({
      name: d.name,
      contactPerson: d.contactPerson ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = editTarget ? `/api/dealers/${editTarget.id}` : "/api/dealers";
    const method = editTarget ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "保存に失敗しました");
      setSaving(false);
      return;
    }
    setShowModal(false);
    setSaving(false);
    fetchDealers();
  }

  async function handleDelete(id: string) {
    if (!confirm("この代理店を削除しますか？")) return;
    await fetch(`/api/dealers/${id}`, { method: "DELETE" });
    fetchDealers();
  }

  const filtered = dealers.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.contactPerson ?? "").toLowerCase().includes(q) ||
      (d.phone ?? "").toLowerCase().includes(q) ||
      (d.email ?? "").toLowerCase().includes(q)
    );
  });

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">代理店登録</h1>
        <button
          onClick={openNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 代理店を登録
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-4 p-4">
        <input
          type="text"
          placeholder="代理店名・担当者・電話・メールで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">代理店が登録されていません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">代理店</th>
                <th className="px-4 py-3">担当者</th>
                <th className="px-4 py-3">電話番号</th>
                <th className="px-4 py-3">メールアドレス</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.contactPerson ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{d.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.email ? (
                      <a href={`mailto:${d.email}`} className="text-blue-600 hover:underline">{d.email}</a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(d)} className="text-xs text-blue-600 hover:underline">編集</button>
                      <button onClick={() => handleDelete(d.id)} className="text-xs text-red-500 hover:underline">削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? "代理店を編集" : "代理店を登録"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
              )}
              <div>
                <label className={labelCls}>代理店 *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>担当者</label>
                <input type="text" value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>電話番号</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>メールアドレス</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? "保存中..." : "保存"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
