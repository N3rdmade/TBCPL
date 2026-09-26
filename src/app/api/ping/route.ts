import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000; // a user is "online" if they pinged in the last 60s
const MAX_ENTRIES = 50_000; // soft cap so a flood can't OOM the lambda
const RL_WINDOW_MS = 10_000; // rate limit window
const RL_MAX = 20; // max requests per IP per window

type Entry = { ts: number; region: string };
type RL = { count: number; reset: number };
type Store = {
  seen: Map<string, Entry>;
  lastSweep: number;
  rl: Map<string, RL>;
};

// Lambda-scoped in-memory store. NOTE: not consistent across Vercel
// instances/regions or cold starts — fine for a "vibes" counter.
// Swap for Upstash Redis (ZADD + ZREMRANGEBYSCORE) later for a real count.
const g = globalThis as unknown as { __tbcpl_ping?: Store };
const store: Store = g.__tbcpl_ping ?? { seen: new Map(), lastSweep: 0, rl: new Map() };
if (!store.rl) store.rl = new Map();
g.__tbcpl_ping = store;

function sweep(now: number) {
  if (now - store.lastSweep < 5_000) return;
  store.lastSweep = now;
  const cutoff = now - WINDOW_MS;
  for (const [id, e] of store.seen) {
    if (e.ts < cutoff) store.seen.delete(id);
  }
  for (const [ip, r] of store.rl) {
    if (r.reset <= now) store.rl.delete(ip);
  }
  if (store.seen.size > MAX_ENTRIES) {
    const trim = store.seen.size - MAX_ENTRIES;
    let i = 0;
    for (const key of store.seen.keys()) {
      if (i++ >= trim) break;
      store.seen.delete(key);
    }
  }
}

function getIp(req: Request): string {
  // Cloudflare sets cf-connecting-ip to the true client IP; prefer it since
  // x-forwarded-for behind CF can be spoofed by upstream clients.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

function getId(req: Request): string {
  const ua = req.headers.get("user-agent") ?? "";
  return `${getIp(req)}::${ua.slice(0, 40)}`;
}

// ponytail: in-memory per-lambda rate limit, swap for Upstash if scaled horizontally
function rateLimit(ip: string, now: number): { ok: boolean; retryAfter: number } {
  const cur = store.rl.get(ip);
  if (!cur || cur.reset <= now) {
    store.rl.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  cur.count++;
  if (cur.count > RL_MAX) return { ok: false, retryAfter: Math.ceil((cur.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

function getRegion(req: Request): string {
  const url = new URL(req.url);
  const r = url.searchParams.get("region")?.trim().toUpperCase();
  if (!r) return "UNKNOWN";
  // whitelist chars so a garbage param can't blow up the key space
  return /^[A-Z0-9_-]{1,16}$/.test(r) ? r : "UNKNOWN";
}

function payload(now: number, region: string) {
  const byRegion: Record<string, number> = {};
  let total = 0;
  for (const { region: r } of store.seen.values()) {
    byRegion[r] = (byRegion[r] ?? 0) + 1;
    total++;
  }
  return {
    online: byRegion[region] ?? 0,
    onlineTotal: total,
    byRegion,
    region,
    windowSeconds: WINDOW_MS / 1000,
    serverTime: now,
  };
}

function handle(req: Request) {
  const now = Date.now();
  sweep(now);
  const rl = rateLimit(getIp(req), now);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: rl.retryAfter },
      {
        status: 429,
        headers: {
          "cache-control": "no-store",
          "retry-after": String(rl.retryAfter),
        },
      },
    );
  }
  const region = getRegion(req);
  store.seen.set(getId(req), { ts: now, region });
  return NextResponse.json(payload(now, region), {
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
