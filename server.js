// Custom Next.js server + WebSocket presence at /api/live.
// Count = unique IPs seen in the last WINDOW_MS, grouped by region.
// ponytail: single-process store, add Redis if you run >1 pm2 instance

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

const WINDOW_MS = 30 * 60 * 1000; // 30 min
const SWEEP_MS = 60 * 1000;
const BROADCAST_MIN_MS = 2000; // don't broadcast more than once per 2s
const REGION_RE = /^[A-Z0-9_-]{1,16}$/;
const MAX_ENTRIES = 100_000;

/** ip -> { ts, region } */
const seen = new Map();
let lastBroadcast = 0;
let broadcastTimer = null;

function getIp(req) {
  const cf = req.headers["cf-connecting-ip"];
  if (cf) return String(cf).trim();
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket.remoteAddress || "anon";
}

function parseRegion(req) {
  try {
    const url = new URL(req.url, "http://x");
    const r = url.searchParams.get("region")?.trim().toUpperCase();
    return r && REGION_RE.test(r) ? r : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function snapshot() {
  const byRegion = {};
  let total = 0;
  for (const { region } of seen.values()) {
    byRegion[region] = (byRegion[region] ?? 0) + 1;
    total++;
  }
  return { onlineTotal: total, byRegion, serverTime: Date.now() };
}

function sendTo(ws, snap) {
  if (ws.readyState !== 1) return;
  ws.send(
    JSON.stringify({
      ...snap,
      online: snap.byRegion[ws.region] ?? 0,
      region: ws.region,
    }),
  );
}

function broadcast(wss) {
  const snap = snapshot();
  for (const ws of wss.clients) sendTo(ws, snap);
}

function scheduleBroadcast(wss) {
  const now = Date.now();
  const wait = Math.max(0, lastBroadcast + BROADCAST_MIN_MS - now);
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    lastBroadcast = Date.now();
    broadcast(wss);
  }, wait);
}

function sweep() {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [ip, e] of seen) {
    if (e.ts < cutoff) seen.delete(ip);
  }
  if (seen.size > MAX_ENTRIES) {
    const trim = seen.size - MAX_ENTRIES;
    let i = 0;
    for (const k of seen.keys()) {
      if (i++ >= trim) break;
      seen.delete(k);
    }
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res, parse(req.url, true)));
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname !== "/api/live") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.region = parseRegion(req);
      ws.isAlive = true;
      wss.emit("connection", ws, req);
      ws.on("pong", () => (ws.isAlive = true));
      ws.on("error", () => {});

      const ip = getIp(req);
      const prev = seen.get(ip);
      seen.set(ip, { ts: Date.now(), region: ws.region });
      // send the new client its snapshot immediately
      sendTo(ws, snapshot());
      // only wake everyone else if the visible count actually changed
      if (!prev) scheduleBroadcast(wss);
    });
  });

  setInterval(() => {
    const before = seen.size;
    sweep();
    if (seen.size !== before) scheduleBroadcast(wss);
  }, SWEEP_MS);

  // heartbeat: drop dead sockets
  setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  server.listen(port, () => {
    console.log(`> ready on http://0.0.0.0:${port}`);
  });
});
