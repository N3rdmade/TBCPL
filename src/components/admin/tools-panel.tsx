"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Trash2,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Replace,
  Sparkles,
  ScanSearch,
  Cloud,
  Search,
  Copy,
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
export function ToolsPanel({ regions }: { regions: Region[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Power tools</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Repo-wide actions. Every one writes a single atomic commit to GitHub.
        </p>
      </div>
      <PurgeCacheTool />
      <SiteSearchTool regions={regions} />
      <DuplicateDetectorTool />
      <OrphanLogosTool />
      <UrlReplaceTool />
      <FillEmptyTool />
    </div>
  );
}

/* ---------------- Purge Cloudflare cache ---------------- */

function PurgeCacheTool() {
  const [scope, setScope] = useState<"everything" | "urls">("everything");
  const [urlsText, setUrlsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ scope: string; purged: number | string; cfRequestId: string | null } | null>(null);

  const run = async () => {
    const urls = urlsText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (scope === "urls" && urls.length === 0) {
      setError("Add at least one URL.");
      return;
    }
    if (scope === "urls" && urls.length > 30) {
      setError("Cloudflare allows up to 30 URLs per call.");
      return;
    }
    if (scope === "everything" && !window.confirm("Purge the entire Cloudflare cache for this zone? This will briefly increase origin load.")) {
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/admin/tools/purge-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope === "urls" ? { scope, urls } : { scope }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        scope?: string;
        purged?: number | string;
        cfRequestId?: string | null;
        error?: string;
        detail?: string;
      };
      if (!r.ok || !j.ok) {
        throw new Error(j.detail ?? j.error ?? "purge_failed");
      }
      setResult({
        scope: j.scope ?? scope,
        purged: j.purged ?? "—",
        cfRequestId: j.cfRequestId ?? null,
      });
      if (scope === "urls") setUrlsText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "purge failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      icon={<Cloud size={18} />}
      title="Purge Cloudflare cache"
      desc="Flush the CDN cache after a content update so visitors see new data immediately."
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setScope("everything")}
            className="rounded-l-lg px-3 py-1.5 text-xs"
            style={{
              background: scope === "everything" ? "var(--accent)" : "transparent",
              color: scope === "everything" ? "white" : "var(--fg-muted)",
            }}
          >
            Everything
          </button>
          <button
            onClick={() => setScope("urls")}
            className="rounded-r-lg border-l px-3 py-1.5 text-xs"
            style={{
              borderColor: "var(--border)",
              background: scope === "urls" ? "var(--accent)" : "transparent",
              color: scope === "urls" ? "white" : "var(--fg-muted)",
            }}
          >
            Specific URLs
          </button>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
          {scope === "everything" ? "Purge all" : "Purge URLs"}
        </button>
      </div>

      {scope === "urls" && (
        <div className="mt-3">
          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            rows={4}
            placeholder={"https://tbcpl.lol/\nhttps://tbcpl.lol/links/USA.json\nhttps://tbcpl.lol/logo/movies/foo.png"}
            className="w-full resize-y rounded-lg border bg-transparent px-3 py-2 font-mono text-xs"
            style={{ borderColor: "var(--border)" }}
          />
          <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
            One URL per line (or comma-separated). Up to 30 per call.
          </p>
        </div>
      )}

      <Err msg={error} />
      {result && (
        <div className="mt-3 text-xs text-[var(--fg-muted)]">
          ✓ Purged{" "}
          {result.scope === "everything"
            ? "entire zone"
            : `${typeof result.purged === "number" ? result.purged : result.purged} URL${result.purged === 1 ? "" : "s"}`}
          {result.cfRequestId && (
            <>
              {" · "}
              <span className="font-mono text-[10px]">{result.cfRequestId}</span>
            </>
          )}
        </div>
      )}
    </Section>
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

/* ---------------- Site search ---------------- */

interface SearchHit {
  region: string;
  categoryId: string;
  siteName: string;
  url: string;
  logo: string;
  enabled: boolean;
}

function SiteSearchTool({ regions }: { regions: Region[] }) {
  const [q, setQ] = useState("");
  const [field, setField] = useState<"any" | "name" | "url">("any");
  const [filterRegion, setFilterRegion] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    hits: SearchHit[];
    totalHits: number;
    totalRegionsScanned: number;
  } | null>(null);

  const search = async () => {
    const query = q.trim();
    if (query.length < 2) {
      setError("Type at least 2 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(
        `/api/admin/tools/site-search?q=${encodeURIComponent(query)}&field=${field}`,
        { cache: "no-store" },
      );
      const j = (await r.json()) as {
        ok?: boolean;
        hits?: SearchHit[];
        totalHits?: number;
        totalRegionsScanned?: number;
        error?: string;
      };
      if (!r.ok || !j.ok) throw new Error(j.error ?? "search_failed");
      setResult({
        hits: j.hits ?? [],
        totalHits: j.totalHits ?? 0,
        totalRegionsScanned: j.totalRegionsScanned ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "search failed");
    } finally {
      setBusy(false);
    }
  };

  const visible = result
    ? filterRegion
      ? result.hits.filter((h) => h.region === filterRegion)
      : result.hits
    : [];
  const regionsInHits = result
    ? Array.from(new Set(result.hits.map((h) => h.region))).sort()
    : [];

  return (
    <Section
      icon={<Search size={18} />}
      title="Search across all regions"
      desc="Find a site by name or URL across every region — no more flipping tabs."
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
          placeholder="netflix, hianime.to, …"
          className="h-9 min-w-[16rem] flex-1 rounded-lg border bg-transparent px-3 text-sm"
          style={{ borderColor: "var(--border)" }}
        />
        <div className="flex rounded-lg border" style={{ borderColor: "var(--border)" }}>
          {(["any", "name", "url"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setField(f)}
              className="px-3 py-1.5 text-xs first:rounded-l-lg last:rounded-r-lg [&:not(:first-child)]:border-l"
              style={{
                borderColor: "var(--border)",
                background: field === f ? "var(--accent)" : "transparent",
                color: field === f ? "white" : "var(--fg-muted)",
              }}
            >
              {f === "any" ? "Name or URL" : f === "name" ? "Name only" : "URL only"}
            </button>
          ))}
        </div>
        <button
          onClick={search}
          disabled={busy || q.trim().length < 2}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>
      <Err msg={error} />
      {result && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--fg-muted)]">
              {result.totalHits} hit{result.totalHits === 1 ? "" : "s"} across {regionsInHits.length} region{regionsInHits.length === 1 ? "" : "s"} · scanned {result.totalRegionsScanned}
            </span>
            {regionsInHits.length > 1 && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterRegion("")}
                  className="rounded-full border px-2 py-0.5 text-[10px]"
                  style={{
                    borderColor: filterRegion === "" ? "var(--accent)" : "var(--border)",
                    background: filterRegion === "" ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "transparent",
                  }}
                >
                  All
                </button>
                {regionsInHits.map((r) => {
                  const meta = regions.find((x) => x.code === r);
                  return (
                    <button
                      key={r}
                      onClick={() => setFilterRegion(r)}
                      className="rounded-full border px-2 py-0.5 text-[10px]"
                      style={{
                        borderColor: filterRegion === r ? "var(--accent)" : "var(--border)",
                        background: filterRegion === r ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "transparent",
                      }}
                    >
                      {meta?.flag ?? ""} {r}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {visible.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead style={{ background: "var(--bg-elev)" }}>
                  <tr className="text-left">
                    <th className="px-2 py-1">Region/Cat</th>
                    <th className="px-2 py-1">Site</th>
                    <th className="px-2 py-1">URL</th>
                    <th className="px-2 py-1">Status</th>
                    <th className="px-2 py-1 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((h, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-2 py-1 font-mono text-[10px]">{h.region}/{h.categoryId}</td>
                      <td className="px-2 py-1">{h.siteName}</td>
                      <td className="px-2 py-1">
                        <a href={h.url} target="_blank" rel="noreferrer" className="break-all text-[var(--accent)] hover:underline">{h.url}</a>
                      </td>
                      <td className="px-2 py-1 text-[10px]">
                        {h.enabled ? (
                          <span className="text-[var(--success,#22c55e)]">enabled</span>
                        ) : (
                          <span className="text-[var(--danger,#f87171)]">disabled</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <a
                          href={`/admin-panel/sites?region=${h.region}`}
                          className="inline-flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          open <ExternalLink size={10} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-[var(--fg-muted)]">No matches.</div>
          )}
        </div>
      )}
    </Section>
  );
}

/* ---------------- Duplicate detector ---------------- */

interface DupGroup {
  key: string;
  reason: "exact_url" | "host_only" | "name";
  occurrences: { region: string; categoryId: string; siteName: string; url: string }[];
}

function DuplicateDetectorTool() {
  const [mode, setMode] = useState<"host" | "exact" | "name">("host");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    duplicates: DupGroup[];
    totalGroups: number;
    totalOccurrences: number;
    totalRegionsScanned: number;
  } | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(`/api/admin/tools/find-duplicates?mode=${mode}`, { cache: "no-store" });
      const j = (await r.json()) as {
        ok?: boolean;
        duplicates?: DupGroup[];
        totalGroups?: number;
        totalOccurrences?: number;
        totalRegionsScanned?: number;
        error?: string;
      };
      if (!r.ok || !j.ok) throw new Error(j.error ?? "scan_failed");
      setResult({
        duplicates: j.duplicates ?? [],
        totalGroups: j.totalGroups ?? 0,
        totalOccurrences: j.totalOccurrences ?? 0,
        totalRegionsScanned: j.totalRegionsScanned ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "scan failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // best-effort
    }
  };

  return (
    <Section
      icon={<Copy size={18} />}
      title="Duplicate detector"
      desc="Find sites that appear in more than one region or category. Pick the matching strategy."
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border" style={{ borderColor: "var(--border)" }}>
          {(["host", "exact", "name"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1.5 text-xs first:rounded-l-lg last:rounded-r-lg [&:not(:first-child)]:border-l"
              style={{
                borderColor: "var(--border)",
                background: mode === m ? "var(--accent)" : "transparent",
                color: mode === m ? "white" : "var(--fg-muted)",
              }}
              title={
                m === "host"
                  ? "Match by hostname only (recommended — catches www., paths)"
                  : m === "exact"
                    ? "Match by full URL exactly"
                    : "Match by site name (case-insensitive)"
              }
            >
              {m === "host" ? "By host" : m === "exact" ? "By exact URL" : "By name"}
            </button>
          ))}
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
          Scan for duplicates
        </button>
        {result && (
          <span className="text-xs text-[var(--fg-muted)]">
            {result.totalGroups} group{result.totalGroups === 1 ? "" : "s"} · {result.totalOccurrences} occurrence{result.totalOccurrences === 1 ? "" : "s"} · scanned {result.totalRegionsScanned} region{result.totalRegionsScanned === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <Err msg={error} />
      {result && result.duplicates.length === 0 && (
        <div className="mt-3 text-xs text-[var(--fg-muted)]">No duplicates found in this mode.</div>
      )}
      {result && result.duplicates.length > 0 && (
        <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
          {result.duplicates.map((g, i) => (
            <div
              key={i}
              className="rounded-lg border p-2"
              style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <code className="break-all font-mono text-[11px] text-[var(--fg)]">{g.key}</code>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border px-2 py-0.5 text-[10px] text-[var(--fg-muted)]" style={{ borderColor: "var(--border)" }}>
                    ×{g.occurrences.length}
                  </span>
                  <button
                    onClick={() => copy(g.key)}
                    className="rounded-md border px-1.5 py-0.5 text-[10px] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    copy
                  </button>
                </div>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-[11px]">
                {g.occurrences.map((o, j) => (
                  <li key={j} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-mono text-[10px] text-[var(--fg-muted)]">{o.region}/{o.categoryId}</span>{" "}
                      · {o.siteName}{" "}
                      <a href={o.url} target="_blank" rel="noreferrer" className="break-all text-[var(--accent)] hover:underline">{o.url}</a>
                    </span>
                    <a
                      href={`/admin-panel/sites?region=${o.region}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-[10px] text-[var(--accent)] hover:underline"
                    >
                      open <ExternalLink size={10} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
