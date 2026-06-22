import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "documents");

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, filename } = await req.json();
  if (!url) return NextResponse.json({ error: "urlが必要です" }, { status: 400 });

  // PMDAなど外部サイトからPDFを取得
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.info.pmda.go.jp/",
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `外部サイトからの取得に失敗しました（${response.status}）` },
      { status: 502 }
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
    return NextResponse.json(
      { error: "PDFファイルではありません" },
      { status: 400 }
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = filename?.split(".").pop() ?? "pdf";
  const savedName = `${randomUUID()}.${ext}`;
  const filepath = join(UPLOAD_DIR, savedName);

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filepath, buffer);

  return NextResponse.json({
    url: `/uploads/documents/${savedName}`,
    originalName: filename ?? savedName,
    size: buffer.length,
  });
}
