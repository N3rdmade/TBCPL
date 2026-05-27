"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Check,
  X,
  ExternalLink,
  AlertTriangle,
  Loader2,
  RotateCw,
  Inbox,
  Upload,
  Link as LinkIcon,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { CATEGORY_META } from "@/lib/constants";

interface RegionLite {
  code: string;
  name: string;
  flag: string;
}

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

interface LogoEntry {
  path: string;
  url: string;
  category: string;
  fileName: string;
}

interface ApprovePayload {
  existingPath?: string;
  upload?: { fileName: string; contentBase64: string; categoryHint?: string };
}

interface ApproveOverrides {
  siteName?: string;
  siteUrl?: string;
  siteFeature?: string;
  targets?: Target[];
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
  const [approving, setApproving] = useState<RequestItem | null>(null);
  const [regions, setRegions] = useState<RegionLite[]>([]);

  useEffect(() => {
    fetch("/api/admin/regions", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { regions: [] }))
      .then((j: { regions?: RegionLite[] }) => setRegions(j.regions ?? []))
      .catch(() => setRegions([]));
  }, []);

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

  const setStatus = async (
    id: string,
    status: Status,
    logo?: ApprovePayload,
    overrides?: ApproveOverrides,
  ) => {
    setUpdatingId(id);
    try {
      const r = await fetch("/api/admin/site-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, logo, overrides }),
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
      setApproving(null);
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
              onApprove={() => setApproving(item)}
              onAction={(s) => setStatus(item.id, s)}
            />
          ))}
        </div>
      )}

      {approving && (
        <ApproveModal
          item={approving}
          regions={regions}
          onCancel={() => setApproving(null)}
          submitting={updatingId === approving.id}
          onConfirm={(logo, overrides) => setStatus(approving.id, "approved", logo, overrides)}
        />
      )}
    </div>
  );
}

function RequestCard({
  item,
  updating,
  onApprove,
  onAction,
}: {
  item: RequestItem;
  updating: boolean;
  onApprove: () => void;
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
            onClick={onApprove}
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

function ApproveModal({
  item,
  regions,
  submitting,
  onCancel,
  onConfirm,
}: {
  item: RequestItem;
  regions: RegionLite[];
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (logo: ApprovePayload | undefined, overrides: ApproveOverrides) => void;
}) {
  // Editable copies of the request fields. siteFeature is kept in state (so the
  // override is correctly computed) but not shown — it's an admin-only note.
  const [siteName, setSiteName] = useState(item.siteName);
  const [siteUrl, setSiteUrl] = useState(item.siteUrl);
  const [siteFeature] = useState(item.siteFeature ?? "");
  const [targets, setTargets] = useState<Target[]>(item.targets);
  const [newRegion, setNewRegion] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const firstCategoryId = targets[0]?.categoryId ?? "";
  // categoryId in links.json uses short keys ("movies") but the on-disk logo
  // folder is the longer alias ("movies_shows"). Map known aliases here.
  const LOGO_FOLDER_ALIAS: Record<string, string> = {
    movies: "movies_shows",
    paid: "paid_apps",
  };
  const defaultLogoFolder = LOGO_FOLDER_ALIAS[firstCategoryId] ?? firstCategoryId;
  const [tab, setTab] = useState<"pick" | "upload" | "url" | "skip">("pick");
  const [logos, setLogos] = useState<LogoEntry[] | null>(null);
  const [logosLoading, setLogosLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pickedPath, setPickedPath] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<{ name: string; base64: string; preview: string } | null>(null);
  const [uploadCategory, setUploadCategory] = useState(defaultLogoFolder);

  const [fetchUrl, setFetchUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "pick" || logos !== null) return;
    setLogosLoading(true);
    fetch("/api/admin/logos", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { items: LogoEntry[] }) => setLogos(j.items))
      .catch(() => setLogos([]))
      .finally(() => setLogosLoading(false));
  }, [tab, logos]);

  const filteredLogos = useMemo(() => {
    if (!logos) return [];
    const q = search.trim().toLowerCase();
    const sameCat = logos.filter(
      (l) =>
        l.category === firstCategoryId ||
        l.category.startsWith(`${firstCategoryId}_`) ||
        firstCategoryId.startsWith(`${l.category}_`),
    );
    const base = sameCat.length ? sameCat : logos;
    if (!q) return base.slice(0, 60);
    return base.filter((l) => l.fileName.toLowerCase().includes(q) || l.path.toLowerCase().includes(q)).slice(0, 60);
  }, [logos, search, firstCategoryId]);

  const onFileChange = (f: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      setUploadFile({ name: f.name, base64, preview: result });
    };
    reader.readAsDataURL(f);
  };

  const fetchFromUrl = async () => {
    if (!fetchUrl.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      const r = await fetch("/api/admin/logo-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fetchUrl.trim() }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        contentBase64?: string;
        suggestedExt?: string;
        suggestedName?: string;
        error?: string;
        detail?: string;
      };
      if (!r.ok || !j.ok || !j.contentBase64) {
        throw new Error(j.detail ?? j.error ?? `HTTP ${r.status}`);
      }
      const base = (j.suggestedName ?? "logo").replace(/\.[^.]+$/, "");
      const ext = j.suggestedExt ?? ".png";
      const slug = (item.siteName || base).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
      const fileName = (slug || base || "logo") + ext;
      const preview = `data:image/${ext.replace(".", "")};base64,${j.contentBase64}`;
      setUploadFile({ name: fileName, base64: j.contentBase64, preview });
      setTab("upload");
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setFetching(false);
    }
  };

  const overrides: ApproveOverrides = {
    siteName: siteName.trim() !== item.siteName ? siteName : undefined,
    siteUrl: siteUrl.trim() !== item.siteUrl ? siteUrl : undefined,
    siteFeature: siteFeature !== (item.siteFeature ?? "") ? siteFeature : undefined,
    targets:
      JSON.stringify(targets) !== JSON.stringify(item.targets) ? targets : undefined,
  };

  const confirm = () => {
    let logo: ApprovePayload | undefined;
    if (tab === "pick" && pickedPath) {
      logo = { existingPath: pickedPath };
    } else if (tab === "upload" && uploadFile) {
      logo = {
        upload: {
          fileName: uploadFile.name,
          contentBase64: uploadFile.base64,
          categoryHint: uploadCategory || firstCategoryId,
        },
      };
    }
    onConfirm(logo, overrides);
  };

  const removeTarget = (idx: number) => {
    setTargets((prev) => prev.filter((_, i) => i !== idx));
  };

  const addTarget = () => {
    if (!newRegion || !newCategory) return;
    const region = newRegion.toUpperCase();
    const categoryId = newCategory.toLowerCase();
    setTargets((prev) =>
      prev.some((t) => t.region === region && t.categoryId === categoryId)
        ? prev
        : [...prev, { region, categoryId }],
    );
    setNewRegion("");
    setNewCategory("");
  };

  const canConfirm =
    targets.length > 0 &&
    !!siteName.trim() &&
    !!siteUrl.trim() &&
    (tab === "skip" || (tab === "pick" && !!pickedPath) || (tab === "upload" && !!uploadFile));

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl"
        style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wide text-[var(--fg-muted)]">Approve request</div>
            <div className="mt-0.5 truncate font-semibold">{item.siteName}</div>
            <div className="truncate text-xs text-[var(--fg-muted)]">{item.siteUrl}</div>
          </div>
          <button onClick={onCancel} aria-label="Close" className="rounded-lg p-1 hover:bg-[var(--bg-card-hover)]">
            <X size={16} />
          </button>
        </div>

        {/* Editable request details */}
        <div className="space-y-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Site name</span>
              <input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border bg-transparent px-3 text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Site URL</span>
              <input
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border bg-transparent px-3 text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
              Targets ({targets.length})
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {targets.length === 0 && (
                <span className="text-xs text-[var(--danger,#f87171)]">No targets — add at least one to approve.</span>
              )}
              {targets.map((t, i) => {
                const cat = CATEGORY_META[t.categoryId];
                return (
                  <span
                    key={`${t.region}::${t.categoryId}::${i}`}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  >
                    <span className="font-mono">{t.region}</span>
                    <span className="text-[var(--fg-muted)]">·</span>
                    <span>{cat ? `${cat.icon} ${cat.label}` : t.categoryId}</span>
                    <button
                      onClick={() => removeTarget(i)}
                      aria-label="Remove target"
                      className="ml-1 rounded-full p-0.5 hover:bg-[var(--bg-card-hover)]"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <select
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                className="h-8 rounded-lg border bg-transparent px-2 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">Region…</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.flag} {r.name} ({r.code})
                  </option>
                ))}
              </select>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="h-8 rounded-lg border bg-transparent px-2 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">Category…</option>
                {Object.entries(CATEGORY_META).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.icon} {meta.label}
                  </option>
                ))}
              </select>
              <button
                onClick={addTarget}
                disabled={!newRegion || !newCategory}
                className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-[var(--bg-card-hover)] disabled:opacity-40"
                style={{ borderColor: "var(--border)" }}
              >
                Add target
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-1 border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
          {(
            [
              { id: "pick", label: "Pick existing", icon: <ImageIcon size={12} /> },
              { id: "upload", label: "Upload", icon: <Upload size={12} /> },
              { id: "url", label: "From URL", icon: <LinkIcon size={12} /> },
              { id: "skip", label: "Skip (folder)", icon: null },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
              style={{
                borderColor: tab === t.id ? "var(--accent)" : "var(--border)",
                background: tab === t.id ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "transparent",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto p-4">
          {tab === "pick" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border px-2" style={{ borderColor: "var(--border)" }}>
                <Search size={14} className="text-[var(--fg-muted)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search logos${firstCategoryId ? ` in ${firstCategoryId}` : ""}…`}
                  className="h-9 w-full bg-transparent text-sm outline-none"
                />
              </div>
              {logosLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-[var(--fg-muted)]">
                  <Loader2 size={14} className="animate-spin" /> Loading logos…
                </div>
              ) : filteredLogos.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--fg-muted)]">No logos.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {filteredLogos.map((l) => {
                    const active = pickedPath === l.path;
                    return (
                      <button
                        key={l.path}
                        onClick={() => setPickedPath(l.path)}
                        className="flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] transition hover:border-[var(--accent)]"
                        style={{
                          borderColor: active ? "var(--accent)" : "var(--border)",
                          background: active ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "transparent",
                        }}
                        title={l.path}
                      >
                        <div className="relative h-10 w-10 overflow-hidden rounded" style={{ background: "var(--bg)" }}>
                          <Image src={l.url} alt="" fill sizes="40px" className="object-contain" unoptimized />
                        </div>
                        <div className="line-clamp-2 text-center">{l.fileName}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-3">
              <label
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <Upload size={20} className="text-[var(--fg-muted)]" />
                <span>Click to choose an image (PNG/SVG/WebP, ≤5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
              </label>
              {uploadFile && (
                <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                  <div className="relative h-12 w-12 overflow-hidden rounded" style={{ background: "var(--bg)" }}>
                    <Image src={uploadFile.preview} alt="" fill sizes="48px" className="object-contain" unoptimized />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      value={uploadFile.name}
                      onChange={(e) => setUploadFile({ ...uploadFile, name: e.target.value })}
                      className="h-8 w-full rounded-lg border bg-transparent px-2 text-xs"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--fg-muted)]">
                      <span>Category:</span>
                      <input
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="h-6 flex-1 rounded border bg-transparent px-1.5"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadFile(null)}
                    aria-label="Remove"
                    className="rounded-lg p-1 hover:bg-[var(--bg-card-hover)]"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "url" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  value={fetchUrl}
                  onChange={(e) => setFetchUrl(e.target.value)}
                  placeholder="https://example.com/favicon.png"
                  className="h-9 flex-1 rounded-lg border bg-transparent px-3 text-sm"
                  style={{ borderColor: "var(--border)" }}
                />
                <button
                  onClick={fetchFromUrl}
                  disabled={fetching || !fetchUrl.trim()}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {fetching ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                  Fetch
                </button>
              </div>
              {fetchError && (
                <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", color: "var(--danger,#f87171)" }}>
                  {fetchError}
                </div>
              )}
              <p className="text-xs text-[var(--fg-muted)]">
                Fetches the image server-side and switches to the Upload tab so you can confirm the filename before committing.
              </p>
            </div>
          )}

          {tab === "skip" && (
            <div className="space-y-2 text-sm text-[var(--fg-muted)]">
              <p>
                Approve without a logo file. The site will be saved with{" "}
                <code className="rounded bg-[var(--bg)] px-1 py-0.5 text-xs">./logo/{firstCategoryId}/</code> as the logo path
                (folder placeholder).
              </p>
              <p>You can always edit the logo later from the Sites editor.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--bg-card-hover)]">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!canConfirm || submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Approve & commit
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
