import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Re-use search logic from the search route
async function fetchLatestUpdatedAt(name: string, manufacturer: string, approvalNumber: string): Promise<string | null> {
  const BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "Referer": "https://www.info.pmda.go.jp/",
  };

  const cheerio = await import("cheerio");

  // Try old site
  try {
    const params = new URLSearchParams({ se: "1", knd: "1", brn: "", nok: "", mak: manufacturer, cla: "", ynd: "0", kno: "", tno: "", ino: "", name, adr: "", sen: "", gsk: "", sub: "1" });
    const res = await fetch(`https://www.info.pmda.go.jp/psearch/html/list_kiki_base.html?${params}`, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const $ = cheerio.load(await res.text());
      let found: string | null = null;
      $("table tr").each((_: number, row: Parameters<typeof $>[0]) => {
        const cells = $(row).find("td");
        if (cells.length < 3) return;
        const link = $(cells[0]).find("a[href*='downfiles/md/PDF']");
        if (!link.length) return;
        const href = link.attr("href") ?? "";
        // Match by approval number in URL if possible
        if (approvalNumber && href.includes(approvalNumber.replace(/\//g, "_"))) {
          found = $(cells[2]).text().trim();
        } else if (!approvalNumber) {
          found = $(cells[2]).text().trim();
        }
      });
      if (found) return found;
    }
  } catch {
    // ignore
  }

  // Try ysearch
  try {
    const params = new URLSearchParams({ name, mak: manufacturer, se: "1", knd: "1", sub: "1" });
    const res = await fetch(`https://www.info.pmda.go.jp/ysearch/html/list_kiki_base.html?${params}`, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const $ = cheerio.load(await res.text());
      let found: string | null = null;
      $("a[href*='downfiles/md']").each((_: number, el: Parameters<typeof $>[0]) => {
        const href = $(el).attr("href") ?? "";
        if (!href.endsWith(".pdf")) return;
        if (approvalNumber && !href.includes(approvalNumber.replace(/\//g, "_"))) return;
        const row = $(el).closest("tr");
        found = row.find("td").eq(2).text().trim() || null;
      });
      if (found) return found;
    }
  } catch {
    // ignore
  }

  return null;
}

// GET: count of devices with updates available
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await prisma.device.count({ where: { pmdaUpdateAvailable: true } });
  const devices = await prisma.device.findMany({
    where: { pmdaUpdateAvailable: true },
    select: { id: true, name: true, deviceCode: true, manufacturer: true, pmdaLastCheckedAt: true, pmdaDocUpdatedAt: true },
  });

  return NextResponse.json({ count, devices });
}

// POST: trigger check for all devices that have a pmdaApprovalNumber
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const deviceId: string | undefined = body.deviceId;

  const devices = await prisma.device.findMany({
    where: {
      ...(deviceId ? { id: deviceId } : {}),
      pmdaApprovalNumber: { not: null },
    },
    select: { id: true, name: true, manufacturer: true, pmdaApprovalNumber: true, pmdaDocUpdatedAt: true },
  });

  const now = new Date();
  let updatedCount = 0;
  let checkedCount = 0;

  for (const device of devices) {
    try {
      const latestUpdatedAt = await fetchLatestUpdatedAt(device.name, device.manufacturer, device.pmdaApprovalNumber ?? "");
      checkedCount++;

      const hasUpdate = latestUpdatedAt !== null && latestUpdatedAt !== device.pmdaDocUpdatedAt;

      await prisma.device.update({
        where: { id: device.id },
        data: {
          pmdaLastCheckedAt: now,
          pmdaUpdateAvailable: hasUpdate,
        },
      });

      if (hasUpdate) updatedCount++;
    } catch {
      // skip device on error
    }
  }

  return NextResponse.json({ checkedCount, updatedCount, checkedAt: now });
}
