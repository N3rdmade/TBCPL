import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionToken } from "@/lib/auth/session";
import { loadAllRegionFiles } from "@/lib/admin/region-scan";
import { getRepoFile } from "@/lib/github/repo";
import { linksPathForRegion } from "@/lib/admin/paths";
import type { LinksData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Result {
  region: string;
  categoryId: string;
  siteName: string;
  url: string;
  status: number | null;
  ok: boolean;
  severity: "ok" | "warn" | "error";
  note: string;
  ms: number;
}

async function checkUrl(url: string, timeoutMs = 8000): Promise<Omit<Result, "region" | "categoryId" | "siteName" | "url">> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "TBCPL-HealthBot/1.0 (+https://tbcpl.lol)" },
      });
      if (res.status === 405 || res.status === 403 || res.status === 501) {
        res = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "TBCPL-HealthBot/1.0" },
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "fetch_failed";
      const ms = Date.now() - t0;
      const aborted = controller.signal.aborted;
      return {
        status: null,
        ok: false,
        severity: "error",
        note: aborted ? `timeout (${timeoutMs}ms)` : msg,
        ms,
      };
    }
    const ms = Date.now() - t0;
    const code = res.status;
    if (code >= 200 && code < 300) return { status: code, ok: true, severity: "ok", note: "ok", ms };
    if (code === 403 || code === 401) return { status: code, ok: false, severity: "warn", note: "forbidden (Cloudflare?)", ms };
    if (code === 429) return { status: code, ok: false, severity: "warn", note: "rate-limited", ms };
    if (code === 404 || code === 410) return { status: code, ok: false, severity: "error", note: "not found", ms };
    if (code >= 500) return { status: code, ok: false, severity: "error", note: "server error", ms };
    return { status: code, ok: false, severity: "warn", note: `http ${code}`, ms };
  } finally {
    clearTimeout(timer);
  }
}

async function runBatched<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const settled = await Promise.all(slice.map(worker));
    out.push(...settled);
  }
  return out;
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  let body: { scope?: "all" | "region"; region?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const targets: { region: string; categoryId: string; siteName: string; url: string }[] = [];

  if (body.scope === "region" && body.region) {
    const region = body.region.toUpperCase();
    const raw = await getRepoFile({ token, path: linksPathForRegion(region) });
    if (!raw) return NextResponse.json({ error: "region_not_found" }, { status: 404 });
    let data: LinksData;
    try { data = JSON.parse(raw) as LinksData; } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 500 });
    }
    for (const cat of data.categories) {
      for (const s of cat.sites) {
        if (s.url && /^https?:\/\//i.test(s.url)) {
          targets.push({ region, categoryId: cat.id, siteName: s.name, url: s.url });
        }
      }
    }
  } else {
    const { files } = await loadAllRegionFiles(token);
    for (const f of files) {
      for (const cat of f.data.categories) {
        for (const s of cat.sites) {
          if (s.url && /^https?:\/\//i.test(s.url)) {
            targets.push({ region: f.region, categoryId: cat.id, siteName: s.name, url: s.url });
          }
        }
      }
    }
  }

  const results: Result[] = await runBatched(targets, 8, async (t) => {
    const r = await checkUrl(t.url);
    return { ...t, ...r };
  });

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.severity === "ok").length,
    warn: results.filter((r) => r.severity === "warn").length,
    error: results.filter((r) => r.severity === "error").length,
  };

  return NextResponse.json({ results, summary });
}
