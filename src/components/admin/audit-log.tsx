"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink, RotateCw } from "lucide-react";

interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  commitSha?: string;
  commitUrl?: string;
  region?: string;
  categoryCount?: number;
  logoCount?: number;
  regionCount?: number;
  requestId?: string;
  newStatus?: string;
  message?: string;
}

export function AuditLog() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/audit", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { items: AuditEntry[] };
      setItems(j.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">Audit log</h1>
        <button
          onClick={() => load()}
          disabled={loading}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)]"
          style={{ borderColor: "var(--border)" }}
        >
          <RotateCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-elev)", color: "var(--danger, #f87171)" }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-[var(--fg-muted)]">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border py-10 text-center text-sm text-[var(--fg-muted)]" style={{ borderColor: "var(--border)" }}>
          No activity yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--bg-elev)" }}>
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Who</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Detail</th>
                <th className="px-3 py-2 font-medium">Commit</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-2 text-xs text-[var(--fg-muted)]">
                    {new Date(it.at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{it.actor}</td>
                  <td className="px-3 py-2 text-xs">{it.action}</td>
                  <td className="px-3 py-2 text-xs text-[var(--fg-muted)]">
                    {it.region && <>region={it.region} </>}
                    {it.categoryCount !== undefined && <>cats={it.categoryCount} </>}
                    {it.logoCount ? <>logos={it.logoCount} </> : null}
                    {it.regionCount !== undefined && <>regions={it.regionCount} </>}
                    {it.newStatus && <>→ {it.newStatus} </>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {it.commitUrl ? (
                      <a
                        href={it.commitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 font-mono text-[var(--accent)] hover:underline"
                      >
                        {it.commitSha?.slice(0, 7)} <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-[var(--fg-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
