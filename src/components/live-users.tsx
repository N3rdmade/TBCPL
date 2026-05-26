"use client";

import { useEffect, useState } from "react";

const PING_INTERVAL_MS = 30_000;

interface PingResponse {
  online: number;
  windowSeconds: number;
  serverTime: number;
}

export function LiveUsers() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function ping() {
      try {
        const res = await fetch("/api/ping", { method: "POST", cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const data = (await res.json()) as PingResponse;
        if (!cancelled) {
          setCount(data.online);
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
  }, []);

  if (error || count === null) return null;

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        background: "var(--bg-elev)",
        borderColor: "var(--border)",
        color: "var(--fg-muted)",
      }}
      title={`${count} ${count === 1 ? "person is" : "people are"} online right now`}
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
      <span>Users in Real-Time using TBCPL </span>
    </div>
  );
}
