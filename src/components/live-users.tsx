"use client";

import { useEffect, useState } from "react";

const PING_INTERVAL_MS = 60_000;

interface PingResponse {
  online: number;
  onlineTotal: number;
  byRegion: Record<string, number>;
  region: string;
  windowSeconds: number;
  serverTime: number;
}

export function LiveUsers({ region, shortLabel }: { region?: string; shortLabel?: string }) {
  const [data, setData] = useState<PingResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const qs = region ? `?region=${encodeURIComponent(region)}` : "";

    async function ping() {
      try {
        const res = await fetch(`/api/ping${qs}`, { method: "POST", cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const json = (await res.json()) as PingResponse;
        if (!cancelled) {
          setData(json);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) timer = setTimeout(ping, PING_INTERVAL_MS);
      }
    }

    ping();

    function onVisibility() {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        ping();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [region]);

  if (error || data === null) return null;

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
