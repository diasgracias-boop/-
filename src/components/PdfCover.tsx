"use client";

import { useEffect, useRef, useState } from "react";

interface PdfCoverProps {
  url: string;
  label: string;
}

export default function PdfCover({ url, label }: PdfCoverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!url) return;
    setState("loading");

    let cancelled = false;

    async function render() {
      try {
        // pdf.js を動的インポート（CDN不要、Next.jsバンドルに含める）
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const pdf = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 0.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: canvas.getContext("2d")!, viewport, canvas }).promise;
        if (!cancelled) setState("ok");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    render();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full h-40 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center relative">
        {state === "loading" && (
          <div className="text-gray-400 text-xs flex flex-col items-center gap-1">
            <span className="animate-pulse text-2xl">📄</span>
            <span>読み込み中...</span>
          </div>
        )}
        {state === "error" && (
          <div className="text-gray-400 text-xs flex flex-col items-center gap-1">
            <span className="text-2xl">📄</span>
            <span>プレビュー不可</span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-1">
              PDFを開く →
            </a>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-contain ${state === "ok" ? "block" : "hidden"}`}
        />
        {state === "ok" && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 hover:opacity-100 transition-opacity bg-black/10"
          >
            <span className="bg-black/70 text-white text-xs rounded px-2 py-1">PDFを開く →</span>
          </a>
        )}
      </div>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}
