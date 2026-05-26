"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, ExternalLink, AlertTriangle, Loader2, RotateCw, Inbox } from "lucide-react";
import { CATEGORY_META } from "@/lib/constants";

type Status = "pending" | "approved" | "rejected" | "spam";

interface Target {
  region: string;
  categoryId: string;
}

interface RequestItem {
  id: string;
  siteUrl: string;
  siteName: string;
  siteFeature: string;
  targets: Target[];
  status: Status;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  commitSha?: string | null;
  commitUrl?: string | null;
}

const FILTERS: { value: Status | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "spam", label: "Spam" },
  { value: "all", label: "All" },
];

export function RequestsInbox() {
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const r = await fetch(`/api/admin/site-requests${qs}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { items: RequestItem[] };
      setItems(j.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: Status) => {
    setUpdatingId(id);
    try {
      const r = await fetch("/api/admin/site-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        commitSha?: string | null;
        commitUrl?: string | null;
        skipped?: string[];
        error?: string;
        detail?: string;
      };
      if (!r.ok || !j.ok) {
        throw new Error(j.detail ?? j.error ?? `HTTP ${r.status}`);
      }
      if (j.skipped && j.skipped.length) {
        setError(`Approved with warnings: ${j.skipped.join("; ")}`);
      }
      if (filter !== "all" && filter !== status) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status,
                  reviewedAt: new Date().toISOString(),
                  commitSha: j.commitSha ?? null,
                  commitUrl: j.commitUrl ?? null,
                }
              : i,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">Site requests</h1>
        <div className="ml-auto flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="rounded-full border px-3 py-1 text-xs"
              style={{
                borderColor: filter === f.value ? "var(--accent)" : "var(--border)",
                background: filter === f.value ? "var(--accent)" : "transparent",
                color: filter === f.value ? "white" : "var(--fg)",
              }}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => load()}
            disabled={loading}
            className="ml-1 inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs hover:bg-[var(--bg-card-hover)]"
            style={{ borderColor: "var(--border)" }}
          >
            <RotateCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
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
        <div
          className="flex flex-col items-center gap-2 rounded-2xl border py-12 text-center text-sm text-[var(--fg-muted)]"
          style={{ borderColor: "var(--border)" }}
        >
          <Inbox size={28} />
          No {filter === "all" ? "" : filter} requests.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              updating={updatingId === item.id}
              onAction={(s) => setStatus(item.id, s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  item,
  updating,
  onAction,
}: {
  item: RequestItem;
  updating: boolean;
  onAction: (s: Status) => void;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{item.siteName}</h3>
            <StatusBadge status={item.status} />
          </div>
          <a
            href={item.siteUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-[var(--accent)] hover:underline"
          >
            {item.siteUrl}
            <ExternalLink size={10} />
          </a>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--fg-muted)]">
            {item.siteFeature}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.targets.map((t, i) => {
              const cat = CATEGORY_META[t.categoryId];
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                  style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
                >
                  <span className="font-mono">{t.region}</span>
                  <span className="text-[var(--fg-muted)]">·</span>
                  <span>
                    {cat ? `${cat.icon} ${cat.label}` : t.categoryId}
                  </span>
                </span>
              );
            })}
          </div>
          <div className="mt-2 text-[10px] text-[var(--fg-muted)]">
            {new Date(item.submittedAt).toLocaleString()}
            {item.reviewedBy && <> · reviewed by {item.reviewedBy}</>}
            {item.commitUrl && item.commitSha && (
              <>
                {" "}·{" "}
                <a
                  href={item.commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[var(--accent)] hover:underline"
                >
                  {item.commitSha.slice(0, 7)}
                </a>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <button
            disabled={updating || item.status === "approved"}
            onClick={() => onAction("approved")}
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)] disabled:opacity-40"
            style={{ borderColor: "var(--border)" }}
            title="Approve and commit to GitHub"
          >
            <Check size={12} /> Approve & add
          </button>
          <button
            disabled={updating || item.status === "rejected"}
            onClick={() => onAction("rejected")}
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)] disabled:opacity-40"
            style={{ borderColor: "var(--border)" }}
          >
            <X size={12} /> Reject
          </button>
          <button
            disabled={updating || item.status === "spam"}
            onClick={() => onAction("spam")}
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)] disabled:opacity-40"
            style={{ borderColor: "var(--border)" }}
          >
            <AlertTriangle size={12} /> Spam
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const colors: Record<Status, string> = {
    pending: "var(--accent)",
    approved: "#22c55e",
    rejected: "#f87171",
    spam: "#9ca3af",
  };
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
      style={{ background: "var(--bg-elev)", color: colors[status] }}
    >
      {status}
    </span>
  );
}
