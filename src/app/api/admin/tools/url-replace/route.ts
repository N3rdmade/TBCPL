import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionToken } from "@/lib/auth/session";
import { commitChanges, type FileChange } from "@/lib/github/repo";
import { loadAllRegionFiles, normalizeUrl } from "@/lib/admin/region-scan";
import { db, COLLECTIONS } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Mode = "exact" | "host";

function matches(siteUrl: string, target: { full: string; host: string }, mode: Mode): boolean {
  const norm = normalizeUrl(siteUrl);
  if (mode === "exact") return norm.full === target.full;
  return norm.host === target.host;
}

// GET ?url=...&mode=exact|host  → preview hits
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  const url = new URL(req.url);
  const queryUrl = url.searchParams.get("url")?.trim();
  const mode = (url.searchParams.get("mode") === "exact" ? "exact" : "host") as Mode;
  if (!queryUrl) return NextResponse.json({ error: "missing_url" }, { status: 400 });

  const target = normalizeUrl(queryUrl);
  const { files, errors } = await loadAllRegionFiles(token);

  const hits: { region: string; categoryId: string; siteName: string; currentUrl: string }[] = [];
  for (const f of files) {
    for (const cat of f.data.categories) {
      for (const s of cat.sites) {
        if (matches(s.url, target, mode)) {
          hits.push({ region: f.region, categoryId: cat.id, siteName: s.name, currentUrl: s.url });
        }
      }
    }
  }
  return NextResponse.json({ hits, scanned: files.length, errors, target });
}

// POST { oldUrl, newUrl, mode } → replace across all regions in one commit
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  let body: { oldUrl?: string; newUrl?: string; mode?: Mode; message?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const oldUrl = body.oldUrl?.trim();
  const newUrl = body.newUrl?.trim();
  const mode: Mode = body.mode === "exact" ? "exact" : "host";
  if (!oldUrl || !newUrl) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const target = normalizeUrl(oldUrl);
  const { files } = await loadAllRegionFiles(token);

  const changes: FileChange[] = [];
  let replaced = 0;
  const touched: string[] = [];

  for (const f of files) {
    let mutated = false;
    for (const cat of f.data.categories) {
      for (const s of cat.sites) {
        if (matches(s.url, target, mode)) {
          if (mode === "host") {
            // Preserve path/query: swap the origin.
            try {
              const orig = new URL(s.url);
              const replacement = new URL(newUrl);
              orig.protocol = replacement.protocol;
              orig.hostname = replacement.hostname;
              if (replacement.port) orig.port = replacement.port;
              s.url = orig.toString();
            } catch {
              s.url = newUrl;
            }
          } else {
            s.url = newUrl;
          }
          mutated = true;
          replaced++;
        }
      }
    }
    if (mutated) {
      changes.push({
        path: f.path,
        content: JSON.stringify(f.data, null, 2) + "\n",
        encoding: "utf-8",
      });
      touched.push(f.region);
    }
  }

  if (changes.length === 0) {
    return NextResponse.json({ ok: false, error: "no_matches", replaced: 0 });
  }

  const message =
    body.message?.trim() ||
    `admin: replace url ${target.host} → ${newUrl} (${replaced} site${replaced === 1 ? "" : "s"})`;

  const result = await commitChanges({ token, message, changes });

  try {
    const d = await db();
    await d.collection(COLLECTIONS.auditLog).insertOne({
      at: new Date(),
      actor: auth.session.githubLogin,
      action: "tools.url-replace",
      oldUrl,
      newUrl,
      mode,
      replaced,
      regions: touched,
      commitSha: result.commitSha,
      commitUrl: result.url,
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }

  return NextResponse.json({
    ok: true,
    replaced,
    regions: touched,
    commitSha: result.commitSha,
    commitUrl: result.url,
  });
}
