"use client";

import { useState } from "react";
import type { PmdaResult } from "@/app/api/pmda/search/route";

interface PmdaSearchModalProps {
  initialName?: string;
  initialManufacturer?: string;
  onSelect: (result: PmdaResult) => void;
  onClose: () => void;
}

export default function PmdaSearchModal({
  initialName = "",
  initialManufacturer = "",
  onSelect,
  onClose,
}: PmdaSearchModalProps) {
  const [name, setName] = useState(initialName);
  const [manufacturer, setManufacturer] = useState(initialManufacturer);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PmdaResult[]>([]);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setFallbackUrl(null);
    setMessage("");
    setSearched(true);

    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (manufacturer) params.set("manufacturer", manufacturer);

    const res = await fetch(`/api/pmda/search?${params}`);
    const data = await res.json();

    setResults(data.results ?? []);
    setFallbackUrl(data.fallbackUrl ?? null);
    setMessage(data.message ?? "");
    setLoading(false);
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col m-4">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">PMDAから添付文書を検索</h3>
            <p className="text-xs text-gray-500 mt-0.5">医薬品医療機器総合機構（PMDA）の公開データを検索します</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="p-5 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">品目名（機器名）</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: HEM-6200"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">製造販売業者名</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="例: オムロン"
                className={inputCls}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || (!name && !manufacturer)}
            className="mt-3 w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                PMDAを検索中...
              </>
            ) : "検索"}
          </button>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Not searched yet */}
          {!searched && (
            <div className="text-center py-10 text-gray-400">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">品目名またはメーカー名を入力して検索してください</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-10 text-gray-400">
              <div className="text-3xl mb-2 animate-pulse">📄</div>
              <p className="text-sm">PMDAを検索しています...</p>
            </div>
          )}

          {/* Results list */}
          {!loading && results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">{results.length}件見つかりました。選択すると添付文書URLが登録されます。</p>
              {results.map((r, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => { onSelect(r); onClose(); }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.manufacturer}</p>
                      {r.approvalNumber && (
                        <p className="text-xs text-gray-400 mt-0.5">承認番号: {r.approvalNumber}</p>
                      )}
                      {r.updatedAt && (
                        <p className="text-xs text-gray-400">更新日: {r.updatedAt}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 items-end shrink-0">
                      <a
                        href={r.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        📄 PDFを確認
                      </a>
                      <span className="text-xs bg-blue-600 text-white rounded-full px-2.5 py-0.5">選択</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results + fallback */}
          {!loading && searched && results.length === 0 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">😞</div>
              {message && <p className="text-sm text-gray-600 mb-4">{message}</p>}
              {fallbackUrl && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left">
                  <p className="text-sm font-medium text-yellow-800 mb-2">手動で検索する</p>
                  <p className="text-xs text-yellow-700 mb-3">
                    PMDAサイトへの自動アクセスができませんでした。<br />
                    以下のリンクから手動で検索し、PDFのURLをコピーして貼り付けてください。
                  </p>
                  <a
                    href={fallbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline break-all"
                  >
                    {fallbackUrl}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
