import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionToken } from "@/lib/auth/session";
import { loadAllRegionFiles, normalizeUrl } from "@/lib/admin/region-scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Occurrence {
  region: string;
  categoryId: string;
  siteName: string;
  url: string;
}

interface DupGroup {
  key: string;
  reason: "exact_url" | "host_only" | "name";
  occurrences: Occurrence[];
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode") ?? "host").toLowerCase() as
    | "exact"
    | "host"
    | "name";

  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  const { files, errors } = await loadAllRegionFiles(token);

  const groups = new Map<string, Occurrence[]>();
  for (const f of files) {
    for (const cat of f.data.categories) {
      for (const s of cat.sites) {
        if (!s.url && mode !== "name") continue;
        if (!s.name && mode === "name") continue;
        let key: string;
        if (mode === "exact") {
          key = normalizeUrl(s.url).full;
        } else if (mode === "host") {
          key = normalizeUrl(s.url).host;
        } else {
          key = s.name.trim().toLowerCase();
        }
        if (!key) continue;
        const list = groups.get(key) ?? [];
        list.push({ region: f.region, categoryId: cat.id, siteName: s.name, url: s.url });
        groups.set(key, list);
      }
    }
  }

  const reason: DupGroup["reason"] =
    mode === "exact" ? "exact_url" : mode === "host" ? "host_only" : "name";

  const duplicates: DupGroup[] = [];
  for (const [key, occurrences] of groups) {
    if (occurrences.length < 2) continue;
    duplicates.push({ key, reason, occurrences });
  }

  duplicates.sort((a, b) => b.occurrences.length - a.occurrences.length || a.key.localeCompare(b.key));

  return NextResponse.json({
    ok: true,
    mode,
    totalRegionsScanned: files.length,
    totalGroups: duplicates.length,
    totalOccurrences: duplicates.reduce((a, g) => a + g.occurrences.length, 0),
    duplicates,
    errors,
  });
}
