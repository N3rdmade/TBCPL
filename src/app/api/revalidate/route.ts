import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { DATA_CACHE_TAG } from "@/lib/data";

export const runtime = "nodejs";

// GitHub push webhook → flush the data cache so edits land instantly.
// Setup: Repo → Settings → Webhooks → Add
//   URL:     https://tbcpl.lol/api/revalidate
//   Secret:  value of env TBCPL_WEBHOOK_SECRET
//   Events:  Just the push event
export async function POST(req: NextRequest) {
  const secret = process.env.TBCPL_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const body = await req.text();
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  revalidateTag(DATA_CACHE_TAG);

  // Also drop Cloudflare's edge cache so visitors see fresh HTML instantly.
  // Fire-and-forget: if CF is down, Next's own cache is already flushed above.
  const zone = process.env.CF_DOMAIN_ZONE;
  const token = process.env.CF_ACCOUNT_TOKEN;
  if (zone && token) {
    fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ purge_everything: true }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
