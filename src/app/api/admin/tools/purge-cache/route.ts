import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db, COLLECTIONS } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

interface PurgeBody {
  scope?: "everything" | "urls";
  urls?: string[];
}

interface CfResponse {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: { id?: string };
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const zone = env.CF_DOMAIN_ZONE();
  const token = env.CF_ACCOUNT_TOKEN();
  if (!zone || !token) {
    return NextResponse.json(
      { error: "cf_not_configured", detail: "CF_DOMAIN_ZONE or CF_ACCOUNT_TOKEN env var is missing." },
      { status: 503 },
    );
  }

  let body: PurgeBody;
  try {
    body = (await req.json()) as PurgeBody;
  } catch {
    body = { scope: "everything" };
  }
  const scope = body.scope ?? "everything";

  let payload: Record<string, unknown>;
  if (scope === "urls") {
    const urls = (body.urls ?? []).map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      return NextResponse.json({ error: "no_urls" }, { status: 400 });
    }
    if (urls.length > 30) {
      return NextResponse.json({ error: "too_many_urls", detail: "Cloudflare allows up to 30 per call." }, { status: 400 });
    }
    payload = { files: urls };
  } else {
    payload = { purge_everything: true };
  }

  let r: Response;
  try {
    r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "network_error";
    return NextResponse.json({ error: "cf_unreachable", detail }, { status: 504 });
  }

  let cf: CfResponse;
  try {
    cf = (await r.json()) as CfResponse;
  } catch {
    return NextResponse.json({ error: "cf_invalid_response", status: r.status }, { status: 502 });
  }

  if (!r.ok || !cf.success) {
    const detail = cf.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") ?? `HTTP ${r.status}`;
    return NextResponse.json({ error: "cf_failed", detail }, { status: 502 });
  }

  try {
    const d = await db();
    await d.collection(COLLECTIONS.auditLog).insertOne({
      at: new Date(),
      actor: auth.session.githubLogin,
      action: "tools.purge-cache",
      scope,
      urlsCount: scope === "urls" ? (body.urls ?? []).length : null,
      cfRequestId: cf.result?.id ?? null,
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }

  return NextResponse.json({
    ok: true,
    scope,
    purged: scope === "urls" ? (body.urls ?? []).length : "all",
    cfRequestId: cf.result?.id ?? null,
  });
}
