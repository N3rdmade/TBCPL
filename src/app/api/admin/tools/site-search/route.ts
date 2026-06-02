import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionToken } from "@/lib/auth/session";
import { loadAllRegionFiles } from "@/lib/admin/region-scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Hit {
  region: string;
  categoryId: string;
  siteName: string;
  url: string;
  logo: string;
  enabled: boolean;
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const qRaw = url.searchParams.get("q") ?? "";
  const q = qRaw.trim().toLowerCase();
  const field = (url.searchParams.get("field") ?? "any").toLowerCase();
  if (!q) return NextResponse.json({ error: "missing_query" }, { status: 400 });
  if (q.length < 2) return NextResponse.json({ error: "query_too_short" }, { status: 400 });

  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  const { files, errors } = await loadAllRegionFiles(token);
  const hits: Hit[] = [];

  for (const f of files) {
    for (const cat of f.data.categories) {
      for (const s of cat.sites) {
        const name = (s.name ?? "").toLowerCase();
        const siteUrl = (s.url ?? "").toLowerCase();
        let match = false;
        if (field === "name") match = name.includes(q);
        else if (field === "url") match = siteUrl.includes(q);
        else match = name.includes(q) || siteUrl.includes(q);

        if (match) {
          hits.push({
            region: f.region,
            categoryId: cat.id,
            siteName: s.name,
            url: s.url,
            logo: s.logo,
            enabled: s.enabled !== false,
          });
        }
      }
    }
  }

  hits.sort((a, b) => a.region.localeCompare(b.region) || a.categoryId.localeCompare(b.categoryId));

  return NextResponse.json({
    ok: true,
    q,
    field,
    totalRegionsScanned: files.length,
    totalHits: hits.length,
    hits,
    errors,
  });
}
