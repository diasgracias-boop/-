import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "documents");
const MAX_SIZE_MB = 20;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "PDF または画像ファイルのみアップロードできます" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `ファイルサイズは${MAX_SIZE_MB}MB以下にしてください` }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.name.split(".").pop() ?? "bin";
  // ファイル名が名称_型式_メーカー形式で送られてきた場合はそのまま使い、重複時は連番を付ける
  const baseName = file.name.replace(/\.[^.]+$/, "") || randomUUID();
  let filename = `${baseName}.${ext}`;
  let filepath = join(UPLOAD_DIR, filename);
  // 同名ファイルが存在する場合は _2, _3... と連番を付ける
  let counter = 2;
  while (true) {
    try {
      await import("fs/promises").then((fs) => fs.access(filepath));
      filename = `${baseName}_${counter}.${ext}`;
      filepath = join(UPLOAD_DIR, filename);
      counter++;
    } catch {
      break; // ファイルが存在しない = このファイル名で保存可能
    }
  }

  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  const url = `/uploads/documents/${filename}`;
  return NextResponse.json({ url, originalName: file.name, size: file.size });
}
