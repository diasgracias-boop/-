"use client";

import { useRef, useState, DragEvent } from "react";
import PdfCover from "./PdfCover";

interface DocumentUploadProps {
  label: string;
  icon: string;
  value: string;
  onChange: (url: string) => void;
  onPmdaClick: () => void;
  deviceInfo?: { name?: string; model?: string; manufacturer?: string };
}

function buildFilename(deviceInfo: DocumentUploadProps["deviceInfo"], ext: string): string | null {
  const parts = [deviceInfo?.name, deviceInfo?.model, deviceInfo?.manufacturer]
    .map((s) => s?.trim().replace(/[/\\:*?"<>|]/g, "").replace(/\s+/g, "_"))
    .filter(Boolean);
  if (parts.length === 0) return null;
  return `${parts.join("_")}.${ext}`;
}

export default function DocumentUpload({
  label,
  icon,
  value,
  onChange,
  onPmdaClick,
  deviceInfo,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function uploadFile(file: File) {
    if (!file) return;
    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop() ?? "pdf";
    const renamedName = buildFilename(deviceInfo, ext);
    const uploadFile = renamedName ? new File([file], renamedName, { type: file.type }) : file;

    const form = new FormData();
    form.append("file", uploadFile);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "アップロードに失敗しました");
    } else {
      onChange(data.url);
    }
    setUploading(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  const isPdf = value.toLowerCase().endsWith(".pdf");

  return (
    <div className="flex flex-col gap-2">
      {/* カバープレビュー */}
      <div
        className={`relative h-44 rounded-xl border-2 transition-colors cursor-pointer overflow-hidden ${
          dragging
            ? "border-blue-400 bg-blue-50"
            : value
            ? "border-gray-200 bg-white"
            : "border-dashed border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
        }`}
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 gap-2">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-xs text-gray-500">アップロード中...</span>
          </div>
        )}

        {!value && !uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 select-none">
            <span className="text-3xl text-gray-300">{icon}</span>
            <span className="text-xs font-semibold text-gray-400">{label}</span>
            <span className="text-xs text-gray-300">クリックまたはドロップ</span>
          </div>
        )}

        {value && isPdf && <PdfCover url={value} label={label} />}

        {value && !isPdf && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="w-full h-full object-contain" />
        )}

        {/* ホバーオーバーレイ（登録済み） */}
        {value && !uploading && (
          <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/20 to-transparent">
            <div className="flex gap-2">
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="bg-black/70 text-white text-xs rounded px-2.5 py-1 hover:bg-black/90"
              >
                開く
              </a>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="bg-black/70 text-white text-xs rounded px-2.5 py-1 hover:bg-black/90"
              >
                差し替え
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                className="bg-red-600/80 text-white text-xs rounded px-2.5 py-1 hover:bg-red-700"
              >
                削除
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <span className="text-xs font-semibold text-gray-500 text-center">{label}</span>

      {/* ボタン行 */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-lg py-1.5 hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
        >
          ⬆ アップロード
        </button>
        <button
          type="button"
          onClick={onPmdaClick}
          className="flex items-center justify-center gap-1 text-xs bg-green-50 border border-green-300 text-green-700 rounded-lg py-1.5 hover:bg-green-100 transition-colors font-medium"
        >
          📄 PMDA
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
