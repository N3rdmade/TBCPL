// Custom Next.js server with a WebSocket presence endpoint at /api/live.
// Presence = count of open WS connections, grouped by region sent on connect.
// ponytail: single-process count, run one pm2 instance or move to Redis pub/sub

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

const REGION_RE = /^[A-Z0-9_-]{1,16}$/;

function parseRegion(req) {
  try {
    const url = new URL(req.url, "http://x");
    const r = url.searchParams.get("region")?.trim().toUpperCase();
    return r && REGION_RE.test(r) ? r : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function snapshot(wss) {
  const byRegion = {};
  let total = 0;
  for (const client of wss.clients) {
    if (client.readyState !== 1) continue;
    const r = client.region || "UNKNOWN";
    byRegion[r] = (byRegion[r] ?? 0) + 1;
    total++;
  }
  return { onlineTotal: total, byRegion, serverTime: Date.now() };
}

function broadcast(wss) {
  const snap = snapshot(wss);
  const payload = JSON.stringify(snap);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(
        JSON.stringify({
          ...snap,
          online: snap.byRegion[client.region || "UNKNOWN"] ?? 0,
          region: client.region || "UNKNOWN",
        }),
      );
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
      ws.on("close", () => broadcast(wss));
      ws.on("error", (e) => console.error("[ws] err", e));
      const snap = snapshot(wss);
      const msg = JSON.stringify({
        ...snap,
        online: snap.byRegion[ws.region] ?? 0,
        region: ws.region,
      });
      console.log("[ws] connect region=%s clients=%d sending=%s", ws.region, wss.clients.size, msg);
      ws.send(msg);
      broadcast(wss);
    });
  });

  // heartbeat: drop dead clients so the count stays honest
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
