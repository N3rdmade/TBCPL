"use client";

import { useEffect, useState } from "react";

interface LiveMsg {
  online: number;
  onlineTotal: number;
  byRegion: Record<string, number>;
  region: string;
  serverTime: number;
}

export function LiveUsers({ region, shortLabel }: { region?: string; shortLabel?: string }) {
  const [data, setData] = useState<LiveMsg | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    function connect() {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const qs = region ? `?region=${encodeURIComponent(region)}` : "";
      ws = new WebSocket(`${proto}//${window.location.host}/api/live${qs}`);
      ws.onmessage = (ev) => {
        try {
          setData(JSON.parse(ev.data) as LiveMsg);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        // ponytail: fixed 5s backoff, add jitter if thundering herd shows up
        retry = setTimeout(connect, 5_000);
      };
      ws.onerror = () => ws?.close();
    }

    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [region]);

  if (data === null) return null;

  const count = region ? data.online : data.onlineTotal;
  const scope = region ? region : "global";
  const short = (shortLabel ?? region ?? "").toUpperCase();
  const title = region
    ? `${count} ${count === 1 ? "person is" : "people are"} online in ${region} right now (${data.onlineTotal} globally)`
    : `${count} ${count === 1 ? "person is" : "people are"} online right now`;

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        background: "var(--bg-elev)",
        borderColor: "var(--border)",
        color: "var(--fg-muted)",
      }}
      title={title}
    >
      <span className="relative grid h-2 w-2 place-items-center">
        <span
          className="absolute inline-block h-2 w-2 animate-ping rounded-full"
          style={{ background: "var(--success)", opacity: 0.6 }}
        />
        <span
          className="relative inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--success)" }}
        />
      </span>
      <span className="tabular-nums text-[var(--fg)]">{count.toLocaleString()}</span>
      {region ? (
        <>
          <span className="sm:hidden">
            Users viewing <span className="text-[var(--fg)]">{short}</span> in Real-Time
          </span>
          <span className="hidden sm:inline">
            Users viewing <span className="text-[var(--fg)]">{scope}</span> in Real-Time
          </span>
        </>
      ) : (
        <>
          <span className="sm:hidden">online</span>
          <span className="hidden sm:inline">Users in Real-Time using TBCPL :)</span>
        </>
      )}
    </div>
  );
}
