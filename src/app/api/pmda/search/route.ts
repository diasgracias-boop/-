import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as cheerio from "cheerio";

export interface PmdaResult {
  name: string;
  manufacturer: string;
  approvalNumber: string;
  pdfUrl: string;
  updatedAt?: string;
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Referer": "https://www.info.pmda.go.jp/",
};

// 旧サイト（フレームベース HTML）検索
async function searchOldSite(name: string, manufacturer: string): Promise<PmdaResult[]> {
  const params = new URLSearchParams({
    se: "1",
    knd: "1",   // 1=医療機器
    brn: "",
    nok: "",
    mak: manufacturer,
    cla: "",
    ynd: "0",
    kno: "",
    tno: "",
    ino: "",
    name: name,
    adr: "",
    sen: "",
    gsk: "",
    sub: "1",
  });

  const url = `https://www.info.pmda.go.jp/psearch/html/list_kiki_base.html?${params}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`PMDA old site: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: PmdaResult[] = [];

  // 旧サイトの検索結果テーブルをパース
  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const link = $(cells[0]).find("a[href*='downfiles/md/PDF']");
    if (!link.length) return;

    const href = link.attr("href") ?? "";
    const pdfUrl = href.startsWith("http") ? href : `https://www.info.pmda.go.jp${href}`;
    const approvalMatch = pdfUrl.match(/\/(\d+)\/(\d+_\w+)_A_/);

    results.push({
      name: $(cells[0]).text().trim() || link.text().trim(),
      manufacturer: $(cells[1]).text().trim(),
      approvalNumber: approvalMatch ? approvalMatch[2].replace(/_/g, "") : "",
      pdfUrl,
      updatedAt: $(cells[2]).text().trim(),
    });
  });

  return results;
}

// 新サイト（pmda.go.jp）の内部 API を試行
async function searchNewSite(name: string, manufacturer: string): Promise<PmdaResult[]> {
  // 新サイトが利用する JSON API（ブラウザ DevTools で確認されたエンドポイント）
  const url = new URL("https://www.pmda.go.jp/api/kiki/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("maker", manufacturer);
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", "20");

  const res = await fetch(url.toString(), {
    headers: { ...BROWSER_HEADERS, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`PMDA new API: ${res.status}`);

  const json = await res.json();
  const items: PmdaResult[] = [];

  // レスポンス構造に応じてパース（実際の構造に合わせて調整）
  const list = json?.result ?? json?.items ?? json?.data ?? [];
  for (const item of list) {
    const pdfUrl =
      item.pdfUrl ??
      item.pdf_url ??
      (item.approvalNo
        ? `https://www.info.pmda.go.jp/downfiles/md/PDF/${String(item.approvalNo).slice(0, 6)}/${item.approvalNo}_A_01_01.pdf`
        : null);
    if (!pdfUrl) continue;

    items.push({
      name: item.name ?? item.productName ?? "",
      manufacturer: item.maker ?? item.manufacturer ?? manufacturer,
      approvalNumber: item.approvalNo ?? "",
      pdfUrl,
      updatedAt: item.updatedAt ?? item.updateDate ?? "",
    });
  }
  return items;
}

// ysearch（電子添文サイト）からスクレイピング
async function searchYsearch(name: string, manufacturer: string): Promise<PmdaResult[]> {
  const params = new URLSearchParams({
    name,
    mak: manufacturer,
    se: "1",
    knd: "1",
    sub: "1",
  });

  const url = `https://www.info.pmda.go.jp/ysearch/html/list_kiki_base.html?${params}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`PMDA ysearch: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: PmdaResult[] = [];

  $("a[href*='downfiles/md']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href.endsWith(".pdf")) return;

    const pdfUrl = href.startsWith("http")
      ? href
      : `https://www.info.pmda.go.jp${href}`;

    const row = $(el).closest("tr");
    const cells = row.find("td");
    const approvalMatch = pdfUrl.match(/PDF\/(\d+)\//);

    results.push({
      name: cells.eq(0).text().trim() || $(el).text().trim(),
      manufacturer: cells.eq(1).text().trim() || manufacturer,
      approvalNumber: approvalMatch?.[1] ?? "",
      pdfUrl,
      updatedAt: cells.eq(2).text().trim(),
    });
  });

  return results;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim() ?? "";
  const manufacturer = searchParams.get("manufacturer")?.trim() ?? "";

  if (!name && !manufacturer) {
    return NextResponse.json({ error: "name または manufacturer を指定してください" }, { status: 400 });
  }

  const errors: string[] = [];

  // 3つのエンドポイントを順番に試す
  for (const fn of [searchOldSite, searchYsearch, searchNewSite]) {
    try {
      const results = await fn(name, manufacturer);
      if (results.length > 0) {
        return NextResponse.json({ results, source: fn.name });
      }
    } catch (e) {
      errors.push(String(e));
    }
  }

  // すべて失敗した場合: 手動検索URLを返す
  const fallbackUrl = `https://www.info.pmda.go.jp/psearch/html/menu_tenpu_base.html`;
  return NextResponse.json({
    results: [],
    fallbackUrl,
    errors,
    message: "PMDAサイトへの自動アクセスができませんでした。手動検索URLをご利用ください。",
  });
}
