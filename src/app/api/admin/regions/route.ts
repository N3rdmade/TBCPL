import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionToken } from "@/lib/auth/session";
import { commitChanges } from "@/lib/github/repo";
import { regionsJsonPath } from "@/lib/admin/paths";
import { db, COLLECTIONS } from "@/lib/db";
import type { Region } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(r: unknown): Region | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  if (typeof o.code !== "string" || !o.code.trim()) return null;
  if (typeof o.name !== "string" || !o.name.trim()) return null;
  if (typeof o.flag !== "string") return null;
  return {
    code: o.code.trim().toUpperCase(),
    name: o.name.trim(),
    flag: o.flag,
    enabled: o.enabled !== false,
  };
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  let body: { regions?: unknown[]; message?: string };
  try {
    body = (await req.json()) as { regions?: unknown[]; message?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!Array.isArray(body.regions)) {
    return NextResponse.json({ error: "missing_regions" }, { status: 400 });
  }

  const clean = body.regions.map(sanitize).filter((r): r is Region => r !== null);
  if (clean.length === 0) {
    return NextResponse.json({ error: "no_valid_regions" }, { status: 400 });
  }

  const codes = new Set(clean.map((r) => r.code));
  if (codes.size !== clean.length) {
    return NextResponse.json({ error: "duplicate_codes" }, { status: 400 });
  }

  const json = JSON.stringify({ regions: clean }, null, 2) + "\n";
  const message = body.message?.trim() || `admin: update regions (${clean.length})`;

  try {
    const result = await commitChanges({
      token,
      message,
      changes: [{ path: regionsJsonPath(), content: json, encoding: "utf-8" }],
      authorName: auth.session.githubLogin,
      authorEmail: `${auth.session.githubId}+${auth.session.githubLogin}@users.noreply.github.com`,
    });

    try {
      const d = await db();
      await d.collection(COLLECTIONS.auditLog).insertOne({
        at: new Date(),
        actor: auth.session.githubLogin,
        action: "publish.regions",
        regionCount: clean.length,
        commitSha: result.commitSha,
        commitUrl: result.url,
      });
    } catch (e) {
      console.error("audit log write failed", e);
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("regions publish failed", e);
    const msg = e instanceof Error ? e.message : "commit_failed";
    return NextResponse.json({ error: "commit_failed", detail: msg }, { status: 500 });
  }
}
