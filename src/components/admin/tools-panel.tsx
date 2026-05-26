"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Trash2,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Activity,
  Replace,
  Sparkles,
  ScanSearch,
} from "lucide-react";
import type { Region } from "@/lib/types";

interface Orphan {
  repoPath: string;
  refPath: string;
  url: string;
  category: string;
  fileName: string;
}
interface BrokenRef {
  logo: string;
  refs: { region: string; categoryId: string; siteName: string }[];
}
interface UrlHit {
  region: string;
  categoryId: string;
  siteName: string;
  currentUrl: string;
}
interface HealthResult {
  region: string;
  categoryId: string;
  siteName: string;
  url: string;
  status: number | null;
  ok: boolean;
  severity: "ok" | "warn" | "error";
  note: string;
  ms: number;
}

export function ToolsPanel({ regions }: { regions: Region[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Power tools</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Repo-wide actions. Every one writes a single atomic commit to GitHub.
        </p>
      </div>
      <OrphanLogosTool />
      <UrlReplaceTool />
      <HealthCheckTool regions={regions} />
      <FillEmptyTool />
    </div>
  );
}

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--bg-elev)", color: "var(--accent)" }}
        >
          {icon}
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-[var(--fg-muted)]">{desc}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Err({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div
      className="mt-2 rounded-lg border px-3 py-2 text-xs"
      style={{ borderColor: "var(--border)", background: "var(--bg-elev)", color: "var(--danger,#f87171)" }}
    >
      {msg}
    </div>
  );
}

function CommitPill({ url, sha }: { url: string; sha: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-[var(--accent)] hover:underline">
      {sha.slice(0, 7)}
      <ExternalLink size={10} />
    </a>
  );
}

/* ---------------- Orphan logos ---------------- */

function OrphanLogosTool() {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ orphans: Orphan[]; broken: BrokenRef[]; scanned: { regions: number; logos: number } } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [commit, setCommit] = useState<{ url: string; sha: string } | null>(null);

  const scan = async () => {
    setLoading(true);
    setError(null);
    setCommit(null);
    try {
      const r = await fetch("/api/admin/tools/orphan-logos", { cache: "no-store" });
      const j = (await r.json()) as { orphans: Orphan[]; broken: BrokenRef[]; scanned: { regions: number; logos: number } };
      if (!r.ok) throw new Error("scan_failed");
      setData(j);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "scan failed");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (p: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const selectAll = () => {
    if (!data) return;
    setSelected(new Set(data.orphans.map((o) => o.repoPath)));
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Permanently delete ${selected.size} orphan logo${selected.size === 1 ? "" : "s"} from GitHub?`)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/tools/orphan-logos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: Array.from(selected) }),
      });
      const j = (await r.json()) as { ok?: boolean; commitSha?: string; commitUrl?: string; error?: string };
      if (!r.ok || !j.ok) throw new Error(j.error ?? "delete_failed");
      setCommit({ url: j.commitUrl!, sha: j.commitSha! });
      await scan();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      icon={<ScanSearch size={18} />}
      title="Orphan logo scanner"
      desc="Find logos in the repo that no site references, plus broken site→logo links."
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={scan}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
          Scan repo
        </button>
        {data && (
          <span className="text-xs text-[var(--fg-muted)]">
            Scanned {data.scanned.regions} regions · {data.scanned.logos} logos · {data.orphans.length} orphan{data.orphans.length === 1 ? "" : "s"} · {data.broken.length} broken ref{data.broken.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <Err msg={error} />
      {commit && (
        <div className="mt-2 text-xs">✓ Deleted. <CommitPill {...commit} /></div>
      )}

      {data && data.orphans.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="rounded-lg border px-2 py-1 text-xs hover:bg-[var(--bg-card-hover)]"
              style={{ borderColor: "var(--border)" }}
            >
              Select all
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg border px-2 py-1 text-xs hover:bg-[var(--bg-card-hover)]"
              style={{ borderColor: "var(--border)" }}
            >
              Clear
            </button>
            <button
              onClick={deleteSelected}
              disabled={busy || selected.size === 0}
              className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs text-[var(--danger,#f87171)] hover:bg-[var(--bg-card-hover)] disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete {selected.size} selected
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
            {data.orphans.map((o) => {
              const checked = selected.has(o.repoPath);
              return (
                <button
                  key={o.repoPath}
                  onClick={() => toggle(o.repoPath)}
                  title={`${o.category}/${o.fileName}`}
                  className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border p-1.5"
                  style={{
                    borderColor: checked ? "var(--accent)" : "var(--border)",
                    background: checked ? "color-mix(in oklab, var(--accent) 18%, var(--bg-elev))" : "var(--bg-elev)",
                  }}
                >
                  <Image src={o.url} alt="" width={48} height={48} className="max-h-full max-w-full object-contain" unoptimized />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-[8px] text-white">
                    {o.fileName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {data && data.broken.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--danger,#f87171)]">Broken references</h3>
          <ul className="mt-2 space-y-1 text-xs">
            {data.broken.map((b) => (
              <li key={b.logo} className="rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--border)" }}>
                <code className="font-mono text-[10px] text-[var(--fg-muted)]">{b.logo}</code>
                <div className="mt-0.5 text-[var(--fg-muted)]">
                  Used by:{" "}
                  {b.refs.map((r, i) => (
                    <span key={`${r.region}-${r.categoryId}-${i}`}>
                      {i > 0 && ", "}
                      <span className="font-mono">{r.region}/{r.categoryId}</span> · {r.siteName}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && data.orphans.length === 0 && data.broken.length === 0 && (
        <div className="mt-3 text-xs text-[var(--fg-muted)]">All clean. No orphans or broken references.</div>
      )}
    </Section>
  );
}

/* ---------------- URL replace ---------------- */

function UrlReplaceTool() {
  const [oldUrl, setOldUrl] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [mode, setMode] = useState<"exact" | "host">("host");
  const [scanning, setScanning] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [hits, setHits] = useState<UrlHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commit, setCommit] = useState<{ url: string; sha: string; replaced: number; regions: string[] } | null>(null);

  const preview = async () => {
    if (!oldUrl.trim()) return;
    setScanning(true);
    setError(null);
    setCommit(null);
    try {
      const r = await fetch(`/api/admin/tools/url-replace?url=${encodeURIComponent(oldUrl)}&mode=${mode}`, { cache: "no-store" });
      const j = (await r.json()) as { hits: UrlHit[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "scan_failed");
      setHits(j.hits);
    } catch (e) {
      setError(e instanceof Error ? e.message : "scan failed");
    } finally {
      setScanning(false);
    }
  };

  const replace = async () => {
    if (!oldUrl.trim() || !newUrl.trim()) return;
    if (!window.confirm(`Replace ${hits?.length ?? "all matching"} URLs across all regions in one commit?`)) return;
    setCommitting(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/tools/url-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldUrl, newUrl, mode }),
      });
      const j = (await r.json()) as { ok?: boolean; replaced?: number; regions?: string[]; commitSha?: string; commitUrl?: string; error?: string };
      if (!r.ok || !j.ok) throw new Error(j.error ?? "replace_failed");
      setCommit({ url: j.commitUrl!, sha: j.commitSha!, replaced: j.replaced ?? 0, regions: j.regions ?? [] });
      setHits(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "replace failed");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Section
      icon={<Replace size={18} />}
      title="Domain URL replace"
      desc="Find & replace a URL (or whole domain) across every region's links.json in a single commit."
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={oldUrl}
          onChange={(e) => setOldUrl(e.target.value)}
          placeholder="https://old-domain.com or full URL"
          className="h-9 rounded-lg border bg-transparent px-3 text-sm"
          style={{ borderColor: "var(--border)" }}
        />
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://new-domain.com or full URL"
          className="h-9 rounded-lg border bg-transparent px-3 text-sm"
          style={{ borderColor: "var(--border)" }}
        />
        <div className="flex gap-2">
          <div className="flex rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setMode("host")}
              className="rounded-l-lg px-3 text-xs"
              style={{
                background: mode === "host" ? "var(--accent)" : "transparent",
                color: mode === "host" ? "white" : "var(--fg-muted)",
              }}
              title="Match the hostname only — preserves URL paths"
            >
              Host
            </button>
            <button
              onClick={() => setMode("exact")}
              className="rounded-r-lg border-l px-3 text-xs"
              style={{
                borderColor: "var(--border)",
                background: mode === "exact" ? "var(--accent)" : "transparent",
                color: mode === "exact" ? "white" : "var(--fg-muted)",
              }}
              title="Match the entire URL exactly"
            >
              Exact
            </button>
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          onClick={preview}
          disabled={scanning || !oldUrl.trim()}
          className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
          Preview hits
        </button>
        <button
          onClick={replace}
          disabled={committing || !oldUrl.trim() || !newUrl.trim() || (hits !== null && hits.length === 0)}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {committing ? <Loader2 size={14} className="animate-spin" /> : <Replace size={14} />}
          Replace & commit
        </button>
      </div>
      <Err msg={error} />
      {commit && (
        <div className="mt-3 text-xs">
          ✓ Replaced {commit.replaced} in {commit.regions.length} region{commit.regions.length === 1 ? "" : "s"} · <CommitPill url={commit.url} sha={commit.sha} />
        </div>
      )}
      {hits && (
        <div className="mt-3 space-y-1 text-xs">
          <div className="font-semibold">{hits.length} match{hits.length === 1 ? "" : "es"}:</div>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {hits.map((h, i) => (
              <li key={i} className="rounded-lg border px-2 py-1" style={{ borderColor: "var(--border)" }}>
                <span className="font-mono text-[10px] text-[var(--fg-muted)]">{h.region}/{h.categoryId}</span> · {h.siteName} ·{" "}
                <span className="font-mono break-all text-[10px]">{h.currentUrl}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/* ---------------- Health check ---------------- */

function HealthCheckTool({ regions }: { regions: Region[] }) {
  const [scope, setScope] = useState<"all" | "region">("region");
  const [region, setRegion] = useState("USA");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<HealthResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; ok: number; warn: number; error: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "errors" | "warnings">("all");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    setSummary(null);
    try {
      const r = await fetch("/api/admin/tools/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, region: scope === "region" ? region : undefined }),
      });
      const j = (await r.json()) as { results?: HealthResult[]; summary?: typeof summary; error?: string };
      if (!r.ok) throw new Error(j.error ?? "check_failed");
      setResults(j.results ?? []);
      setSummary(j.summary ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "check failed");
    } finally {
      setRunning(false);
    }
  };

  const visible = !results
    ? []
    : filter === "errors"
      ? results.filter((r) => r.severity === "error")
      : filter === "warnings"
        ? results.filter((r) => r.severity === "warn" || r.severity === "error")
        : results;

  return (
    <Section
      icon={<Activity size={18} />}
      title="Site health check"
      desc="Batch-fetch every site URL. Surface 404s, timeouts, Cloudflare blocks, dead domains."
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setScope("region")}
            className="rounded-l-lg px-3 py-1.5 text-xs"
            style={{
              background: scope === "region" ? "var(--accent)" : "transparent",
              color: scope === "region" ? "white" : "var(--fg-muted)",
            }}
          >
            One region
          </button>
          <button
            onClick={() => setScope("all")}
            className="rounded-r-lg border-l px-3 py-1.5 text-xs"
            style={{
              borderColor: "var(--border)",
              background: scope === "all" ? "var(--accent)" : "transparent",
              color: scope === "all" ? "white" : "var(--fg-muted)",
            }}
          >
            All regions (slow)
          </button>
        </div>
        {scope === "region" && (
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-9 rounded-lg border px-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
          >
            {regions.map((r) => (
              <option key={r.code} value={r.code}>{r.flag} {r.name} ({r.code})</option>
            ))}
          </select>
        )}
        <button
          onClick={run}
          disabled={running}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
          Run check
        </button>
        {summary && (
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-[var(--fg-muted)]">{summary.total} total</span>
            <span className="text-[var(--success,#22c55e)]">{summary.ok} ok</span>
            <span className="text-amber-400">{summary.warn} warn</span>
            <span className="text-[var(--danger,#f87171)]">{summary.error} error</span>
          </div>
        )}
      </div>
      <Err msg={error} />
      {results && results.length > 0 && (
        <>
          <div className="mt-3 flex gap-1">
            {(["all", "warnings", "errors"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: filter === f ? "var(--accent)" : "var(--border)",
                  background: filter === f ? "var(--accent)" : "transparent",
                  color: filter === f ? "white" : "var(--fg)",
                }}
              >
                {f === "all" ? "All" : f === "errors" ? "Errors only" : "Warnings + errors"}
              </button>
            ))}
          </div>
          <div className="mt-3 max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead style={{ background: "var(--bg-elev)" }}>
                <tr className="text-left">
                  <th className="px-2 py-1">Region/Cat</th>
                  <th className="px-2 py-1">Site</th>
                  <th className="px-2 py-1">URL</th>
                  <th className="px-2 py-1 text-right">Status</th>
                  <th className="px-2 py-1">Note</th>
                  <th className="px-2 py-1 text-right">ms</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-2 py-1 font-mono text-[10px]">{r.region}/{r.categoryId}</td>
                    <td className="px-2 py-1">{r.siteName}</td>
                    <td className="px-2 py-1">
                      <a href={r.url} target="_blank" rel="noreferrer" className="break-all text-[var(--accent)] hover:underline">{r.url}</a>
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{r.status ?? "—"}</td>
                    <td
                      className="px-2 py-1"
                      style={{
                        color:
                          r.severity === "error"
                            ? "var(--danger,#f87171)"
                            : r.severity === "warn"
                              ? "#fbbf24"
                              : "var(--fg-muted)",
                      }}
                    >
                      {r.note}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-[var(--fg-muted)]">{r.ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {results && results.length === 0 && (
        <div className="mt-3 text-xs text-[var(--fg-muted)]">No URLs to check.</div>
      )}
    </Section>
  );
}

/* ---------------- Fill empty categories ---------------- */

function FillEmptyTool() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ seeded: number; details?: { region: string; categoryId: string }[]; commitSha?: string; commitUrl?: string; message?: string } | null>(null);

  const run = async () => {
    if (!window.confirm("Add a placeholder site to every empty category across all regions?")) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/admin/tools/fill-empty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = (await r.json()) as { ok?: boolean; seeded?: number; details?: { region: string; categoryId: string }[]; commitSha?: string; commitUrl?: string; message?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? "fill_failed");
      setResult({
        seeded: j.seeded ?? 0,
        details: j.details,
        commitSha: j.commitSha,
        commitUrl: j.commitUrl,
        message: j.message,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "fill failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Section
      icon={<Sparkles size={18} />}
      title="Fill empty categories"
      desc="Seed every empty category with a 'coming soon — request a site' placeholder so users see something to click."
    >
      <button
        onClick={run}
        disabled={running}
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        Fill empty categories
      </button>
      <Err msg={error} />
      {result && (
        <div className="mt-3 text-xs">
          {result.seeded > 0 ? (
            <>
              ✓ Seeded {result.seeded} categor{result.seeded === 1 ? "y" : "ies"}.{" "}
              {result.commitSha && result.commitUrl && <CommitPill url={result.commitUrl} sha={result.commitSha} />}
              {result.details && result.details.length > 0 && (
                <ul className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-[var(--fg-muted)] sm:grid-cols-3">
                  {result.details.map((d, i) => (
                    <li key={i} className="font-mono">{d.region}/{d.categoryId}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[var(--fg-muted)]">
              <AlertTriangle size={12} /> {result.message ?? "Nothing to seed — no empty categories found."}
            </span>
          )}
        </div>
      )}
    </Section>
  );
}
