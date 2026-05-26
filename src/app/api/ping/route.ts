import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000; // a user is "online" if they pinged in the last 60s
const MAX_ENTRIES = 50_000; // soft cap so a flood can't OOM the lambda

type Store = {
  seen: Map<string, number>;
  lastSweep: number;
};

// Lambda-scoped in-memory store. NOTE: not consistent across Vercel
// instances/regions or cold starts — fine for a "vibes" counter.
// Swap for Upstash Redis (ZADD + ZREMRANGEBYSCORE) later for a real count.
const g = globalThis as unknown as { __tbcpl_ping?: Store };
const store: Store = g.__tbcpl_ping ?? { seen: new Map(), lastSweep: 0 };
g.__tbcpl_ping = store;

function sweep(now: number) {
  if (now - store.lastSweep < 5_000) return;
  store.lastSweep = now;
  const cutoff = now - WINDOW_MS;
  for (const [id, ts] of store.seen) {
    if (ts < cutoff) store.seen.delete(id);
  }
  // hard cap fallback
  if (store.seen.size > MAX_ENTRIES) {
    const trim = store.seen.size - MAX_ENTRIES;
    let i = 0;
    for (const key of store.seen.keys()) {
      if (i++ >= trim) break;
      store.seen.delete(key);
    }
  }
}

function getId(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  const ua = req.headers.get("user-agent") ?? "";
  // Coarse identity — IP + UA — no cookies, no fingerprinting.
  return `${ip}::${ua.slice(0, 40)}`;
}

function payload(now: number) {
  return {
    online: store.seen.size,
    windowSeconds: WINDOW_MS / 1000,
    serverTime: now,
  };
}

export async function GET(req: Request) {
  const now = Date.now();
  sweep(now);
  // GET also counts as a heartbeat (so the widget can be passive).
  store.seen.set(getId(req), now);
  return NextResponse.json(payload(now), {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  const now = Date.now();
  sweep(now);
  store.seen.set(getId(req), now);
  return NextResponse.json(payload(now), {
    headers: { "cache-control": "no-store" },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
