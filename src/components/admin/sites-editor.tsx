"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  RotateCw,
  Upload,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  X,
  Image as ImageIcon,
  Sparkles,
  CheckSquare,
  Square,
  Power,
  PowerOff,
  Link as LinkIcon,
} from "lucide-react";
import { normalizeAsset } from "@/lib/utils";
import { deriveLogoFilename } from "@/lib/admin/paths";
import { CATEGORY_META } from "@/lib/constants";
import type { Category, Region, Site, SiteStatus } from "@/lib/types";

interface SitesEditorProps {
  regions: Region[];
  initialRegion: string;
}

interface MultiTarget {
  region: string;
  categoryId: string;
  siteName?: string;
  currentUrl?: string;
}

interface PendingLogo {
  categoryId: string;
  fileName: string;
  contentBase64: string;
}

interface LogoEntry {
  path: string;
  url: string;
  category: string;
  fileName: string;
}

interface EditingTarget {
  categoryId: string;
  siteIndex: number;
}

const STATUSES: { value: SiteStatus; label: string; color: string }[] = [
  { value: "ok", label: "OK", color: "var(--fg-muted)" },
  { value: "new", label: "New", color: "var(--success, #22c55e)" },
  { value: "trusted", label: "Trusted", color: "var(--accent)" },
  { value: "down", label: "Down", color: "var(--danger, #f87171)" },
];

export function SitesEditor({ regions, initialRegion }: SitesEditorProps) {
  const [region, setRegion] = useState(initialRegion);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [original, setOriginal] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ url: string; sha: string } | null>(null);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [logos, setLogos] = useState<LogoEntry[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pendingLogos = useRef<Map<string, PendingLogo>>(new Map());

  const toggleSelected = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastResult(null);
    pendingLogos.current.clear();
    try {
      const r = await fetch(`/api/admin/links?region=${region}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { categories: Category[] };
      setCategories(j.categories);
      setOriginal(JSON.stringify(j.categories));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load logo gallery once
  useEffect(() => {
    fetch("/api/admin/logos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j: { items?: LogoEntry[] }) => setLogos(j.items ?? []))
      .catch(() => undefined);
  }, []);

  const dirty = useMemo(() => {
    if (!categories) return false;
    return JSON.stringify(categories) !== original;
  }, [categories, original]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setCategories((prev) => prev?.map((c) => (c.id === id ? { ...c, ...patch } : c)) ?? null);
  }, []);

  const removeCategory = useCallback((id: string) => {
    setCategories((prev) => prev?.filter((c) => c.id !== id) ?? null);
  }, []);

  const addCategory = useCallback(() => {
    const id = window.prompt("New category id (lowercase, no spaces):")?.trim().toLowerCase();
    if (!id) return;
    const name = window.prompt("Display name:")?.trim();
    if (!name) return;
    setCategories((prev) => [...(prev ?? []), { id, name, sites: [] }]);
  }, []);

  const onCategoryDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setCategories((prev) => {
      if (!prev) return prev;
      const oldIdx = prev.findIndex((c) => c.id === active.id);
      const newIdx = prev.findIndex((c) => c.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  }, []);

  const setSites = useCallback((categoryId: string, sites: Site[]) => {
    setCategories((prev) =>
      prev?.map((c) => (c.id === categoryId ? { ...c, sites } : c)) ?? null,
    );
  }, []);

  const updateSite = useCallback(
    (categoryId: string, idx: number, patch: Partial<Site>) => {
      setCategories((prev) =>
        prev?.map((c) =>
          c.id === categoryId
            ? { ...c, sites: c.sites.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }
            : c,
        ) ?? null,
      );
    },
    [],
  );

  const removeSite = useCallback((categoryId: string, idx: number) => {
    setCategories((prev) =>
      prev?.map((c) =>
        c.id === categoryId ? { ...c, sites: c.sites.filter((_, i) => i !== idx) } : c,
      ) ?? null,
    );
    setEditing(null);
  }, []);

  const toggleSiteEnabled = useCallback((categoryId: string, idx: number) => {
    setCategories((prev) =>
      prev?.map((c) => {
        if (c.id !== categoryId) return c;
        return {
          ...c,
          sites: c.sites.map((s, i) => {
            if (i !== idx) return s;
            const next = s.enabled === false ? true : false;
            return { ...s, enabled: next };
          }),
        };
      }) ?? null,
    );
  }, []);

  const bulkSetEnabled = useCallback(
    (enabled: boolean) => {
      setCategories((prev) =>
        prev?.map((c) => ({
          ...c,
          sites: c.sites.map((s, i) =>
            selected.has(`${c.id}::${i}`) ? { ...s, enabled } : s,
          ),
        })) ?? null,
      );
    },
    [selected],
  );

  const bulkSetStatus = useCallback(
    (status: SiteStatus) => {
      setCategories((prev) =>
        prev?.map((c) => ({
          ...c,
          sites: c.sites.map((s, i) =>
            selected.has(`${c.id}::${i}`) ? { ...s, status } : s,
          ),
        })) ?? null,
      );
    },
    [selected],
  );

  const bulkDelete = useCallback(() => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} site${selected.size === 1 ? "" : "s"}?`)) return;
    setCategories((prev) =>
      prev?.map((c) => ({
        ...c,
        sites: c.sites.filter((_, i) => !selected.has(`${c.id}::${i}`)),
      })) ?? null,
    );
    setSelected(new Set());
  }, [selected]);

  const addSite = useCallback(
    (categoryId: string) => {
      setCategories((prev) => {
        if (!prev) return prev;
        const cat = prev.find((c) => c.id === categoryId);
        if (!cat) return prev;
        const newSite: Site = {
          name: "New site",
          url: "https://",
          logo: `./logo/${categoryId}/`,
          status: "new",
        };
        const next = prev.map((c) =>
          c.id === categoryId ? { ...c, sites: [...c.sites, newSite] } : c,
        );
        const newIdx = cat.sites.length;
        setTimeout(() => setEditing({ categoryId, siteIndex: newIdx }), 0);
        return next;
      });
    },
    [],
  );

  const handleLogoFromUrl = useCallback(
    async (
      categoryId: string,
      url: string,
      siteCtx: { name?: string; url?: string },
    ): Promise<{ pendingRef: string; previewDataUrl: string }> => {
      const r = await fetch("/api/admin/logo-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        contentBase64?: string;
        mimeType?: string;
        suggestedExt?: string;
        suggestedName?: string;
        error?: string;
        detail?: string;
      };
      if (!r.ok || !j.ok || !j.contentBase64) {
        throw new Error(j.detail ?? j.error ?? `HTTP ${r.status}`);
      }
      const fileName = deriveLogoFilename({
        originalName: j.suggestedName ?? "logo" + (j.suggestedExt ?? ".png"),
        mimeType: j.mimeType,
        siteName: siteCtx.name,
        siteUrl: siteCtx.url,
      });
      const key = `${categoryId}/${fileName}`;
      pendingLogos.current.set(key, {
        categoryId,
        fileName,
        contentBase64: j.contentBase64,
      });
      const previewDataUrl = `data:${j.mimeType ?? "image/png"};base64,${j.contentBase64}`;
      setLogos((prev) => [
        ...prev,
        {
          path: `./logo/${categoryId}/${fileName}`,
          url: previewDataUrl,
          category: categoryId,
          fileName,
        },
      ]);
      return { pendingRef: `pending://${key}`, previewDataUrl };
    },
    [],
  );

  const handleLogoUpload = useCallback(
    async (
      categoryId: string,
      file: File,
      siteCtx: { name?: string; url?: string },
    ): Promise<string> => {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`Logo too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max is 10MB.`);
      }
      const buf = await file.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      const fileName = deriveLogoFilename({
        originalName: file.name,
        mimeType: file.type,
        siteName: siteCtx.name,
        siteUrl: siteCtx.url,
      });
      const key = `${categoryId}/${fileName}`;
      pendingLogos.current.set(key, {
        categoryId,
        fileName,
        contentBase64: b64,
      });
      const localUrl = URL.createObjectURL(file);
      setLogos((prev) => [
        ...prev,
        {
          path: `./logo/${categoryId}/${fileName}`,
          url: localUrl,
          category: categoryId,
          fileName,
        },
      ]);
      return `pending://${key}`;
    },
    [],
  );

  const [previewOpen, setPreviewOpen] = useState(false);

  const publishDiff = useMemo(() => {
    if (!categories) return null;
    let parsedOriginal: Category[] = [];
    try {
      parsedOriginal = JSON.parse(original || "[]") as Category[];
    } catch {
      parsedOriginal = [];
    }
    const byIdOld = new Map(parsedOriginal.map((c) => [c.id, c]));
    const byIdNew = new Map(categories.map((c) => [c.id, c]));

    const addedCategories: string[] = [];
    const removedCategories: string[] = [];
    const renamedCategories: { id: string; from: string; to: string }[] = [];
    const siteChanges: {
      categoryId: string;
      added: string[];
      removed: string[];
      modified: { name: string; fields: string[] }[];
    }[] = [];

    for (const [id, cat] of byIdNew) {
      if (!byIdOld.has(id)) addedCategories.push(id);
    }
    for (const [id, cat] of byIdOld) {
      if (!byIdNew.has(id)) removedCategories.push(id);
    }
    for (const [id, newCat] of byIdNew) {
      const oldCat = byIdOld.get(id);
      if (!oldCat) continue;
      if (oldCat.name !== newCat.name) {
        renamedCategories.push({ id, from: oldCat.name, to: newCat.name });
      }
      const oldSitesByUrl = new Map(oldCat.sites.map((s) => [s.url, s]));
      const newSitesByUrl = new Map(newCat.sites.map((s) => [s.url, s]));
      const added: string[] = [];
      const removed: string[] = [];
      const modified: { name: string; fields: string[] }[] = [];
      for (const [url, s] of newSitesByUrl) {
        if (!oldSitesByUrl.has(url)) added.push(s.name);
      }
      for (const [url, s] of oldSitesByUrl) {
        if (!newSitesByUrl.has(url)) removed.push(s.name);
      }
      for (const [url, newSite] of newSitesByUrl) {
        const oldSite = oldSitesByUrl.get(url);
        if (!oldSite) continue;
        const fields: string[] = [];
        if (oldSite.name !== newSite.name) fields.push("name");
        if (oldSite.logo !== newSite.logo) fields.push("logo");
        if ((oldSite.status ?? "ok") !== (newSite.status ?? "ok")) fields.push("status");
        if ((oldSite.enabled !== false) !== (newSite.enabled !== false)) fields.push("enabled");
        if ((oldSite.description ?? "") !== (newSite.description ?? "")) fields.push("description");
        if (JSON.stringify(oldSite.tags ?? []) !== JSON.stringify(newSite.tags ?? [])) fields.push("tags");
        if (fields.length > 0) modified.push({ name: newSite.name, fields });
      }
      if (added.length || removed.length || modified.length) {
        siteChanges.push({ categoryId: id, added, removed, modified });
      }
    }

    const totalChanges =
      addedCategories.length +
      removedCategories.length +
      renamedCategories.length +
      siteChanges.reduce((a, c) => a + c.added.length + c.removed.length + c.modified.length, 0);

    return {
      addedCategories,
      removedCategories,
      renamedCategories,
      siteChanges,
      logoUploadCount: pendingLogos.current.size,
      totalChanges,
    };
  }, [categories, original]);

  const handlePublish = useCallback(async () => {
    if (!categories) return;
    setPreviewOpen(false);
    setSaving(true);
    setError(null);
    setLastResult(null);
    try {
      const r = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          categories,
          message: message.trim() || undefined,
          logoUploads: Array.from(pendingLogos.current.values()),
        }),
      });
      const j = (await r.json()) as { ok?: boolean; commitSha?: string; url?: string; error?: string; detail?: string };
      if (!r.ok || !j.ok) {
        throw new Error(j.detail ?? j.error ?? `HTTP ${r.status}`);
      }
      setLastResult({ url: j.url!, sha: j.commitSha! });
      setOriginal(JSON.stringify(categories));
      pendingLogos.current.clear();
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  }, [categories, region, message]);

  const editingSite =
    editing && categories
      ? categories.find((c) => c.id === editing.categoryId)?.sites[editing.siteIndex] ?? null
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Edit sites</h1>
        <select
          value={region}
          onChange={(e) => {
            if (dirty && !window.confirm("Discard unsaved changes?")) return;
            setRegion(e.target.value);
          }}
          className="h-9 rounded-lg border px-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
        >
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.flag} {r.name} ({r.code})
            </option>
          ))}
        </select>
        <button
          onClick={() => load()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          <RotateCw size={14} className={loading ? "animate-spin" : ""} /> Reload
        </button>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-[var(--accent)]">Unsaved</span>}
          <button
            onClick={() => {
              setSelectMode((v) => {
                if (v) clearSelection();
                return !v;
              });
            }}
            className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm hover:bg-[var(--bg-card-hover)]"
            style={{
              borderColor: selectMode ? "var(--accent)" : "var(--border)",
              background: selectMode ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "transparent",
            }}
          >
            {selectMode ? <CheckSquare size={14} /> : <Square size={14} />}
            {selectMode ? "Selecting" : "Select"}
          </button>
          <button
            onClick={addCategory}
            className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm hover:bg-[var(--bg-card-hover)]"
            style={{ borderColor: "var(--border)" }}
          >
            <Plus size={14} /> Category
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

      {lastResult && (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
        >
          ✓ Published.{" "}
          <a href={lastResult.url} target="_blank" rel="noreferrer" className="font-mono text-[var(--accent)] hover:underline">
            {lastResult.sha.slice(0, 7)}
            <ExternalLink size={11} className="ml-0.5 inline-block" />
          </a>
        </div>
      )}

      {loading || !categories ? (
        <div className="flex items-center gap-2 py-12 text-sm text-[var(--fg-muted)]">
          <Loader2 size={16} className="animate-spin" /> Loading {region}…
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {categories.map((cat) => (
                <CategoryBlock
                  key={cat.id}
                  category={cat}
                  onUpdate={(patch) => updateCategory(cat.id, patch)}
                  onRemove={() => removeCategory(cat.id)}
                  onSitesReorder={(sites) => setSites(cat.id, sites)}
                  onAddSite={() => addSite(cat.id)}
                  onEditSite={(idx) => setEditing({ categoryId: cat.id, siteIndex: idx })}
                  onToggleStatus={(idx) => toggleSiteEnabled(cat.id, idx)}
                  selectMode={selectMode}
                  selected={selected}
                  onToggleSelect={toggleSelected}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {selectMode && selected.size > 0 && (
        <div
          className="sticky bottom-20 z-30 flex flex-wrap items-center gap-2 rounded-2xl border p-3 backdrop-blur-xl"
          style={{ borderColor: "var(--accent)", background: "color-mix(in oklab, var(--bg) 92%, transparent)" }}
        >
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <button
            onClick={() => bulkSetEnabled(true)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)]"
            style={{ borderColor: "var(--border)" }}
          >
            <Power size={12} /> Enable
          </button>
          <button
            onClick={() => bulkSetEnabled(false)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)]"
            style={{ borderColor: "var(--border)" }}
          >
            <PowerOff size={12} /> Disable
          </button>
          <button
            onClick={() => bulkSetStatus("new")}
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)]"
            style={{ borderColor: "var(--border)" }}
          >
            <Sparkles size={12} /> Mark new
          </button>
          <button
            onClick={bulkDelete}
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs text-[var(--danger,#f87171)] hover:bg-[var(--bg-card-hover)]"
            style={{ borderColor: "var(--border)" }}
          >
            <Trash2 size={12} /> Delete
          </button>
          <button
            onClick={clearSelection}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]"
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      <div
        className="sticky bottom-4 z-20 mt-6 flex flex-col gap-2 rounded-2xl border p-3 backdrop-blur-xl md:flex-row md:items-center"
        style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--bg) 88%, transparent)" }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`admin: update ${region} links`}
          className="h-9 flex-1 rounded-lg border px-3 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
        />
        <button
          onClick={() => setPreviewOpen(true)}
          disabled={!dirty || saving}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Publishing…" : "Review & publish"}
        </button>
      </div>

      {previewOpen && publishDiff && (
        <PublishPreviewModal
          region={region}
          message={message}
          diff={publishDiff}
          saving={saving}
          onCancel={() => setPreviewOpen(false)}
          onConfirm={handlePublish}
        />
      )}

      {editing && editingSite && (
        <EditDrawer
          site={editingSite}
          categoryId={editing.categoryId}
          regions={regions}
          currentRegion={region}
          logos={logos}
          onClose={() => setEditing(null)}
          onChange={(patch) => updateSite(editing.categoryId, editing.siteIndex, patch)}
          onDelete={() => removeSite(editing.categoryId, editing.siteIndex)}
          onLogoUpload={handleLogoUpload}
          onLogoFromUrl={handleLogoFromUrl}
        />
      )}
    </div>
  );
}

function CategoryBlock({
  category,
  onUpdate,
  onRemove,
  onSitesReorder,
  onAddSite,
  onEditSite,
  onToggleStatus,
  selectMode,
  selected,
  onToggleSelect,
}: {
  category: Category;
  onUpdate: (patch: Partial<Category>) => void;
  onRemove: () => void;
  onSitesReorder: (sites: Site[]) => void;
  onAddSite: () => void;
  onEditSite: (siteIndex: number) => void;
  onToggleStatus: (siteIndex: number) => void;
  selectMode: boolean;
  selected: Set<string>;
  onToggleSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const siteIds = useMemo(
    () => category.sites.map((_, i) => `${category.id}::${i}`),
    [category.sites, category.id],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onSiteDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = siteIds.indexOf(active.id as string);
    const newIdx = siteIds.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    onSitesReorder(arrayMove(category.sites, oldIdx, newIdx));
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderColor: "var(--border)", background: "var(--bg-card)" }}
      className="rounded-2xl border"
    >
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag category"
          className="cursor-grab touch-none p-1 text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          <GripVertical size={16} />
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)]"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <input
          value={category.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 rounded-lg border bg-transparent px-2 py-1 text-sm font-semibold"
          style={{ borderColor: "var(--border)" }}
        />
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[10px]"
          style={{ background: "var(--bg-elev)", color: "var(--fg-muted)" }}
        >
          {category.id}
        </span>
        <span className="text-xs tabular-nums text-[var(--fg-muted)]">{category.sites.length}</span>
        <button
          onClick={() => {
            if (window.confirm(`Delete category "${category.name}" and all ${category.sites.length} sites?`)) {
              onRemove();
            }
          }}
          aria-label="Delete category"
          className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--danger,#f87171)]"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {open && (
        <div className="border-t px-3 pb-3 pt-3" style={{ borderColor: "var(--border)" }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSiteDragEnd}>
            <SortableContext items={siteIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {category.sites.map((site, idx) => {
                  const key = `${category.id}::${idx}`;
                  return (
                    <SiteCardEditable
                      key={key}
                      id={key}
                      site={site}
                      selectMode={selectMode}
                      isSelected={selected.has(key)}
                      onClick={() => {
                        if (selectMode) onToggleSelect(key);
                        else onEditSite(idx);
                      }}
                      onToggleStatus={() => onToggleStatus(idx)}
                    />
                  );
                })}
                <button
                  onClick={onAddSite}
                  className="flex min-h-[110px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-[var(--fg-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Plus size={20} />
                  Add site
                </button>
              </div>
            </SortableContext>
          </DndContext>
          {category.sites.length === 0 && (
            <div className="mt-2 text-center text-xs text-[var(--fg-muted)]">
              No sites yet — click &ldquo;Add site&rdquo;.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SiteCardEditable({
  id,
  site,
  selectMode,
  isSelected,
  onClick,
  onToggleStatus,
}: {
  id: string;
  site: Site;
  selectMode: boolean;
  isSelected: boolean;
  onClick: () => void;
  onToggleStatus: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: selectMode,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const status = STATUSES.find((s) => s.value === (site.status ?? "ok"));
  const isDisabled = site.enabled === false;
  const logoSrc = site.logo.startsWith("pending://") ? null : normalizeAsset(site.logo);
  const isPlaceholder = site.logo.startsWith("pending://") || !site.logo || site.logo.endsWith("/");

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: isSelected ? "var(--accent)" : isDisabled ? "var(--danger, #f87171)" : "var(--border)",
        background: isSelected
          ? "color-mix(in oklab, var(--accent) 14%, var(--bg-elev))"
          : "var(--bg-elev)",
        opacity: isDisabled ? (isDragging ? 0.25 : 0.5) : style.opacity,
      }}
      className="group relative flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-3 transition hover:border-[var(--accent)] hover:bg-[var(--bg-card-hover)]"
      onClick={onClick}
    >
      {selectMode ? (
        <span
          aria-hidden
          className="absolute left-2 top-2 text-[var(--accent)]"
        >
          {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
        </span>
      ) : (
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag"
          className="absolute left-1.5 top-1.5 cursor-grab touch-none p-1 text-[var(--fg-muted)] opacity-0 transition group-hover:opacity-100"
        >
          <GripVertical size={12} />
        </button>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!selectMode) onToggleStatus();
        }}
        disabled={selectMode}
        aria-label={isDisabled ? "Disabled — click to enable" : "Enabled — click to disable"}
        title={isDisabled ? "Disabled (hidden on site) — click to enable" : "Enabled — click to disable"}
        className="absolute right-1.5 top-1.5 rounded-full p-1 transition hover:scale-125 disabled:cursor-default disabled:hover:scale-100"
      >
        {isDisabled ? (
          <PowerOff size={12} className="text-[var(--danger,#f87171)]" />
        ) : (
          <span
            className="block h-2 w-2 rounded-full"
            style={{ background: status?.color ?? "var(--fg-muted)" }}
          />
        )}
      </button>

      <div className="relative h-10 w-10 overflow-hidden rounded-lg" style={{ background: "var(--bg)" }}>
        {logoSrc && !isPlaceholder ? (
          <Image src={logoSrc} alt="" fill sizes="40px" className="object-contain" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--fg-muted)]">
            <ImageIcon size={14} />
          </div>
        )}
      </div>
      <div className="line-clamp-2 text-center text-xs font-medium">{site.name || "Untitled"}</div>
    </div>
  );
}

function EditDrawer({
  site,
  categoryId,
  regions,
  currentRegion,
  logos,
  onClose,
  onChange,
  onDelete,
  onLogoUpload,
  onLogoFromUrl,
}: {
  site: Site;
  categoryId: string;
  regions: Region[];
  currentRegion: string;
  logos: LogoEntry[];
  onClose: () => void;
  onChange: (patch: Partial<Site>) => void;
  onDelete: () => void;
  onLogoUpload: (
    categoryId: string,
    file: File,
    siteCtx: { name?: string; url?: string },
  ) => Promise<string>;
  onLogoFromUrl: (
    categoryId: string,
    url: string,
    siteCtx: { name?: string; url?: string },
  ) => Promise<{ pendingRef: string; previewDataUrl: string }>;
}) {
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlBusy, setUrlBusy] = useState(false);

  const fetchFromUrl = async () => {
    if (!logoUrl.trim()) return;
    setUrlBusy(true);
    setUrlError(null);
    try {
      const { pendingRef, previewDataUrl } = await onLogoFromUrl(categoryId, logoUrl.trim(), {
        name: site.name,
        url: site.url,
      });
      onChange({ logo: pendingRef });
      setPreviewUrl(previewDataUrl);
      setUrlMode(false);
      setLogoUrl("");
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setUrlBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tagsValue = (site.tags ?? []).join(", ");
  const isPending = site.logo.startsWith("pending://");
  const liveSrc = previewUrl ?? (isPending ? null : normalizeAsset(site.logo));

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const pending = await onLogoUpload(categoryId, file, { name: site.name, url: site.url });
      onChange({ logo: pending });
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl border shadow-2xl sm:rounded-2xl"
        style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {pickerOpen ? (
          <LogoPicker
            logos={logos}
            currentCategory={categoryId}
            onPick={(p) => {
              onChange({ logo: p });
              setPreviewUrl(null);
              setPickerOpen(false);
            }}
            onBack={() => setPickerOpen(false)}
            onClose={onClose}
          />
        ) : (
          <>
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-lg font-bold">Edit site</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4 overflow-y-auto px-5 pb-5">
          <div className="flex items-center gap-3">
            <div
              className="relative h-16 w-16 overflow-hidden rounded-xl border"
              style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}
            >
              {liveSrc ? (
                <Image src={liveSrc} alt="" fill sizes="64px" className="object-contain" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--fg-muted)]">
                  <ImageIcon size={20} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Sparkles size={12} /> Pick existing
                </button>
                <label
                  className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  Upload new
                  <input type="file" accept="image/*" onChange={onPickFile} className="hidden" />
                </label>
                <button
                  onClick={() => setUrlMode((v) => !v)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs hover:bg-[var(--bg-card-hover)]"
                  style={{
                    borderColor: urlMode ? "var(--accent)" : "var(--border)",
                    background: urlMode ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "transparent",
                  }}
                >
                  <LinkIcon size={12} /> From URL
                </button>
              </div>
              {urlMode && (
                <div className="flex gap-1.5">
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") fetchFromUrl();
                    }}
                    placeholder="https://example.com/logo.png"
                    className="h-8 flex-1 rounded-lg border bg-transparent px-2 text-xs"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <button
                    onClick={fetchFromUrl}
                    disabled={urlBusy || !logoUrl.trim()}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {urlBusy ? <Loader2 size={12} className="animate-spin" /> : "Fetch"}
                  </button>
                </div>
              )}
              {urlError && (
                <div className="text-[10px] text-[var(--danger,#f87171)]">{urlError}</div>
              )}
            </div>
          </div>

          <Field label="Name">
            <input
              value={site.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm"
              style={{ borderColor: "var(--border)" }}
            />
          </Field>

          <Field label="URL">
            <input
              value={site.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://"
              className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm"
              style={{ borderColor: "var(--border)" }}
            />
          </Field>

          <Field label="Logo path">
            <input
              value={site.logo}
              onChange={(e) => onChange({ logo: e.target.value })}
              className="h-9 w-full rounded-lg border bg-transparent px-3 font-mono text-xs"
              style={{ borderColor: "var(--border)" }}
            />
          </Field>

          <Field label="Visibility">
            <button
              type="button"
              onClick={() => onChange({ enabled: site.enabled === false ? true : false })}
              className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition hover:bg-[var(--bg-card-hover)]"
              style={{
                borderColor: site.enabled === false ? "var(--danger, #f87171)" : "var(--accent)",
                background:
                  site.enabled === false
                    ? "color-mix(in oklab, var(--danger, #f87171) 14%, transparent)"
                    : "color-mix(in oklab, var(--accent) 14%, transparent)",
              }}
            >
              {site.enabled === false ? (
                <>
                  <PowerOff size={14} className="text-[var(--danger,#f87171)]" />
                  Disabled — hidden on public site
                </>
              ) : (
                <>
                  <Power size={14} className="text-[var(--accent)]" />
                  Enabled — shown on public site
                </>
              )}
            </button>
          </Field>

          <Field label="Status">
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onChange({ status: s.value })}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor:
                      (site.status ?? "ok") === s.value ? "var(--accent)" : "var(--border)",
                    background:
                      (site.status ?? "ok") === s.value
                        ? "color-mix(in oklab, var(--accent) 14%, transparent)"
                        : "transparent",
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Tags (comma-separated)">
            <input
              value={tagsValue}
              onChange={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                onChange({ tags: tags.length ? tags : undefined });
              }}
              placeholder="hd, fast, no-ads"
              className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm"
              style={{ borderColor: "var(--border)" }}
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={site.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value || undefined })}
              rows={2}
              className="w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            />
          </Field>

          <MultiTargetPanel
            site={site}
            currentTarget={{ region: currentRegion, categoryId }}
            regions={regions}
          />

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                if (window.confirm("Remove this site?")) onDelete();
              }}
              className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs text-[var(--danger,#f87171)] hover:bg-[var(--bg-card-hover)]"
              style={{ borderColor: "var(--border)" }}
            >
              <Trash2 size={12} /> Delete
            </button>
            <button
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

function LogoPicker({
  logos,
  currentCategory,
  onPick,
  onBack,
  onClose,
}: {
  logos: LogoEntry[];
  currentCategory: string;
  onPick: (path: string) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"category" | "all">("category");

  const filtered = useMemo(() => {
    const cur = currentCategory.toLowerCase();
    const matchesCat = (lc: string) =>
      lc === cur || lc.startsWith(`${cur}_`) || cur.startsWith(`${lc}_`) || lc.includes(cur) || cur.includes(lc);
    const base = scope === "category"
      ? logos.filter((l) => matchesCat(l.category.toLowerCase()))
      : logos;
    if (!q.trim()) return base;
    const ql = q.toLowerCase();
    return base.filter(
      (l) => l.fileName.toLowerCase().includes(ql) || l.category.toLowerCase().includes(ql),
    );
  }, [logos, currentCategory, scope, q]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            aria-label="Back"
            className="rounded-lg border px-2 py-1 text-xs text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]"
            style={{ borderColor: "var(--border)" }}
          >
            ← Back
          </button>
          <h3 className="font-semibold">Choose a logo</h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 flex gap-2 px-5">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter…"
          className="h-9 flex-1 rounded-lg border bg-transparent px-3 text-sm"
          style={{ borderColor: "var(--border)" }}
        />
        <div className="flex rounded-lg border" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setScope("category")}
            className="rounded-l-lg px-3 text-xs"
            style={{
              background: scope === "category" ? "var(--accent)" : "transparent",
              color: scope === "category" ? "white" : "var(--fg-muted)",
            }}
          >
            Same category
          </button>
          <button
            onClick={() => setScope("all")}
            className="rounded-r-lg border-l px-3 text-xs"
            style={{
              borderColor: "var(--border)",
              background: scope === "all" ? "var(--accent)" : "transparent",
              color: scope === "all" ? "white" : "var(--fg-muted)",
            }}
          >
            All
          </button>
        </div>
      </div>
      <div className="mt-3 grid flex-1 auto-rows-min grid-cols-4 gap-2 overflow-y-auto px-5 pb-5 sm:grid-cols-6">
        {filtered.map((l) => (
          <button
            key={l.path}
            onClick={() => onPick(l.path)}
            title={`${l.category}/${l.fileName}`}
            className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border p-1 hover:border-[var(--accent)]"
            style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
          >
            <Image
              src={l.url}
              alt=""
              width={48}
              height={48}
              className="max-h-full max-w-full object-contain"
              unoptimized
            />
            <span
              className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[8px] text-white opacity-0 group-hover:opacity-100"
            >
              {l.fileName}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-xs text-[var(--fg-muted)]">
            No logos match.
          </div>
        )}
      </div>
    </div>
  );
}

function MultiTargetPanel({
  site,
  currentTarget,
  regions,
}: {
  site: Site;
  currentTarget: { region: string; categoryId: string };
  regions: Region[];
}) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hits, setHits] = useState<MultiTarget[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState<MultiTarget[]>([]);
  const [pendingRemove, setPendingRemove] = useState<MultiTarget[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const CATEGORY_OPTIONS = useMemo(() => Object.keys(CATEGORY_META), []);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ commitSha: string; commitUrl: string; added: MultiTarget[]; removed: MultiTarget[]; skipped: string[] } | null>(null);

  const scan = async () => {
    if (!site.url || !/^https?:\/\//i.test(site.url)) {
      setError("Save a valid URL first.");
      return;
    }
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(
        `/api/admin/tools/url-replace?url=${encodeURIComponent(site.url)}&mode=exact`,
        { cache: "no-store" },
      );
      const j = (await r.json()) as { hits?: MultiTarget[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "scan_failed");
      setHits(j.hits ?? []);
      setPendingAdd([]);
      setPendingRemove([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "scan failed");
    } finally {
      setScanning(false);
    }
  };

  const isCurrent = (t: { region: string; categoryId: string }) =>
    t.region.toUpperCase() === currentTarget.region.toUpperCase() &&
    t.categoryId === currentTarget.categoryId;

  const queueAdd = () => {
    if (selectedRegions.length === 0 || selectedCats.length === 0) return;
    const additions: MultiTarget[] = [];
    const skipped: string[] = [];
    for (const rRaw of selectedRegions) {
      const r = rRaw.toUpperCase();
      for (const c of selectedCats) {
        if (hits?.some((h) => h.region === r && h.categoryId === c)) {
          skipped.push(`${r}/${c}`);
          continue;
        }
        if (pendingAdd.some((t) => t.region === r && t.categoryId === c)) continue;
        if (additions.some((t) => t.region === r && t.categoryId === c)) continue;
        additions.push({ region: r, categoryId: c });
      }
    }
    if (additions.length > 0) {
      setPendingAdd((prev) => [...prev, ...additions]);
    }
    if (skipped.length > 0) {
      setError(`Already exists: ${skipped.join(", ")}`);
    } else {
      setError(null);
    }
    setSelectedRegions([]);
    setSelectedCats([]);
  };

  const toggleSelectedRegion = (code: string) => {
    setSelectedRegions((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  };
  const toggleSelectedCat = (id: string) => {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleRemove = (t: MultiTarget) => {
    if (isCurrent(t)) {
      setError("Can't remove from the current view. Delete here instead.");
      return;
    }
    setPendingRemove((prev) =>
      prev.some((x) => x.region === t.region && x.categoryId === t.categoryId)
        ? prev.filter((x) => !(x.region === t.region && x.categoryId === t.categoryId))
        : [...prev, t],
    );
  };

  const commit = async () => {
    if (pendingAdd.length === 0 && pendingRemove.length === 0) return;
    if (!window.confirm(
      `Commit: +${pendingAdd.length} target${pendingAdd.length === 1 ? "" : "s"}, -${pendingRemove.length}?`,
    )) return;
    setCommitting(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/site-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseSite: {
            name: site.name,
            url: site.url,
            logo: site.logo,
            status: site.status,
            description: site.description,
            tags: site.tags,
            enabled: site.enabled,
          },
          addToTargets: pendingAdd,
          removeFromTargets: pendingRemove,
        }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        added?: MultiTarget[];
        removed?: MultiTarget[];
        skipped?: string[];
        commitSha?: string;
        commitUrl?: string;
        error?: string;
      };
      if (!r.ok || !j.ok) throw new Error(j.error ?? "commit_failed");
      setResult({
        commitSha: j.commitSha!,
        commitUrl: j.commitUrl!,
        added: j.added ?? [],
        removed: j.removed ?? [],
        skipped: j.skipped ?? [],
      });
      setPendingAdd([]);
      setPendingRemove([]);
      await scan();
    } catch (e) {
      setError(e instanceof Error ? e.message : "commit failed");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !hits) void scan();
        }}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]"
      >
        <span>Appears in regions{hits ? ` (${hits.length})` : ""}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={scan}
              disabled={scanning}
              className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
              style={{ borderColor: "var(--border)" }}
            >
              {scanning ? <Loader2 size={10} className="animate-spin" /> : <RotateCw size={10} />}
              Rescan
            </button>
            <span className="text-[10px] text-[var(--fg-muted)]">Matched by exact URL across every region.</span>
          </div>

          {hits && hits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hits.map((h, i) => {
                const current = isCurrent(h);
                const queued = pendingRemove.some(
                  (x) => x.region === h.region && x.categoryId === h.categoryId,
                );
                return (
                  <button
                    key={`${h.region}-${h.categoryId}-${i}`}
                    onClick={() => toggleRemove(h)}
                    disabled={current}
                    title={current ? "Current location — edit here" : queued ? "Will be removed on commit" : "Click to mark for removal"}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                    style={{
                      borderColor: queued ? "var(--danger,#f87171)" : current ? "var(--accent)" : "var(--border)",
                      background: queued
                        ? "color-mix(in oklab, var(--danger,#f87171) 18%, transparent)"
                        : current
                          ? "color-mix(in oklab, var(--accent) 14%, transparent)"
                          : "var(--bg-elev)",
                      color: queued ? "var(--danger,#f87171)" : "var(--fg)",
                      textDecoration: queued ? "line-through" : undefined,
                    }}
                  >
                    <span className="font-mono">{h.region}</span>
                    <span className="text-[var(--fg-muted)]">·</span>
                    <span>{h.categoryId}</span>
                    {queued && <X size={10} />}
                  </button>
                );
              })}
            </div>
          )}
          {hits && hits.length === 0 && (
            <div className="text-[11px] text-[var(--fg-muted)]">Only appears in the current view.</div>
          )}

          <div className="space-y-2">
            <span className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Also add to:</span>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[var(--fg-muted)]">Regions</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRegions(regions.map((r) => r.code))}
                    className="text-[10px] text-[var(--accent)] hover:underline"
                  >
                    All
                  </button>
                  <span className="text-[10px] text-[var(--fg-muted)]">·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRegions([])}
                    className="text-[10px] text-[var(--fg-muted)] hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {regions.map((r) => {
                  const on = selectedRegions.includes(r.code);
                  return (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => toggleSelectedRegion(r.code)}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                      style={{
                        borderColor: on ? "var(--accent)" : "var(--border)",
                        background: on
                          ? "color-mix(in oklab, var(--accent) 14%, transparent)"
                          : "transparent",
                      }}
                    >
                      {on ? <CheckSquare size={10} /> : <Square size={10} />}
                      <span className="font-mono">{r.flag} {r.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[var(--fg-muted)]">Categories</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCats([...CATEGORY_OPTIONS])}
                    className="text-[10px] text-[var(--accent)] hover:underline"
                  >
                    All
                  </button>
                  <span className="text-[10px] text-[var(--fg-muted)]">·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCats([])}
                    className="text-[10px] text-[var(--fg-muted)] hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {CATEGORY_OPTIONS.map((id) => {
                  const meta = CATEGORY_META[id];
                  const on = selectedCats.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleSelectedCat(id)}
                      title={meta.label}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                      style={{
                        borderColor: on ? "var(--accent)" : "var(--border)",
                        background: on
                          ? "color-mix(in oklab, var(--accent) 14%, transparent)"
                          : "transparent",
                      }}
                    >
                      {on ? <CheckSquare size={10} /> : <Square size={10} />}
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={queueAdd}
              disabled={selectedRegions.length === 0 || selectedCats.length === 0}
              className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
              style={{ borderColor: "var(--border)" }}
            >
              <Plus size={10} /> Queue {selectedRegions.length * selectedCats.length || ""} target{selectedRegions.length * selectedCats.length === 1 ? "" : "s"}
            </button>
          </div>

          {pendingAdd.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {pendingAdd.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setPendingAdd((prev) => prev.filter((_, j) => j !== i))}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                  style={{
                    borderColor: "var(--success,#22c55e)",
                    background: "color-mix(in oklab, var(--success,#22c55e) 18%, transparent)",
                  }}
                >
                  <Plus size={10} /> <span className="font-mono">{t.region}</span> · {t.categoryId} <X size={10} />
                </button>
              ))}
            </div>
          )}

          {(pendingAdd.length > 0 || pendingRemove.length > 0) && (
            <button
              onClick={commit}
              disabled={committing}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {committing ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Commit {pendingAdd.length + pendingRemove.length} change{pendingAdd.length + pendingRemove.length === 1 ? "" : "s"}
            </button>
          )}

          {error && <div className="text-[10px] text-[var(--danger,#f87171)]">{error}</div>}
          {result && (
            <div className="text-[10px] text-[var(--fg-muted)]">
              ✓ +{result.added.length} / −{result.removed.length}{" "}
              <a href={result.commitUrl} target="_blank" rel="noreferrer" className="font-mono text-[var(--accent)] hover:underline">
                {result.commitSha.slice(0, 7)}
              </a>
              {result.skipped.length > 0 && (
                <span className="ml-1 text-amber-400">· skipped: {result.skipped.join(", ")}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

interface PublishDiff {
  addedCategories: string[];
  removedCategories: string[];
  renamedCategories: { id: string; from: string; to: string }[];
  siteChanges: {
    categoryId: string;
    added: string[];
    removed: string[];
    modified: { name: string; fields: string[] }[];
  }[];
  logoUploadCount: number;
  totalChanges: number;
}

function PublishPreviewModal({
  region,
  message,
  diff,
  saving,
  onCancel,
  onConfirm,
}: {
  region: string;
  message: string;
  diff: PublishDiff;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const empty =
    diff.totalChanges === 0 && diff.logoUploadCount === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl"
        style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-base font-bold">Review changes to <span className="font-mono">{region}</span></h2>
            <p className="text-xs text-[var(--fg-muted)]">
              {diff.totalChanges} change{diff.totalChanges === 1 ? "" : "s"}
              {diff.logoUploadCount > 0 && ` · ${diff.logoUploadCount} new logo${diff.logoUploadCount === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          {empty && (
            <div className="text-xs text-[var(--fg-muted)]">No detectable changes. Publishing anyway will still create a commit.</div>
          )}

          {diff.addedCategories.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--success,#22c55e)]">
                + Added categories ({diff.addedCategories.length})
              </div>
              <ul className="mt-1 ml-3 list-disc text-xs">
                {diff.addedCategories.map((id) => (
                  <li key={id} className="font-mono">{id}</li>
                ))}
              </ul>
            </div>
          )}

          {diff.removedCategories.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--danger,#f87171)]">
                − Removed categories ({diff.removedCategories.length})
              </div>
              <ul className="mt-1 ml-3 list-disc text-xs">
                {diff.removedCategories.map((id) => (
                  <li key={id} className="font-mono">{id}</li>
                ))}
              </ul>
            </div>
          )}

          {diff.renamedCategories.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                Renamed categories ({diff.renamedCategories.length})
              </div>
              <ul className="mt-1 ml-3 list-disc text-xs">
                {diff.renamedCategories.map((c) => (
                  <li key={c.id}>
                    <span className="font-mono">{c.id}</span>: {c.from} → {c.to}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diff.siteChanges.map((sc) => (
            <div
              key={sc.categoryId}
              className="rounded-lg border p-2"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <div className="text-xs font-semibold">
                <span className="font-mono">{sc.categoryId}</span>
                <span className="ml-2 text-[10px] font-normal text-[var(--fg-muted)]">
                  +{sc.added.length} / −{sc.removed.length} / ~{sc.modified.length}
                </span>
              </div>
              {sc.added.length > 0 && (
                <div className="mt-1 text-[11px]">
                  <span className="text-[var(--success,#22c55e)]">+ </span>
                  {sc.added.join(", ")}
                </div>
              )}
              {sc.removed.length > 0 && (
                <div className="mt-1 text-[11px]">
                  <span className="text-[var(--danger,#f87171)]">− </span>
                  {sc.removed.join(", ")}
                </div>
              )}
              {sc.modified.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-[11px]">
                  {sc.modified.map((m, i) => (
                    <li key={i}>
                      <span className="text-amber-400">~ </span>
                      {m.name}{" "}
                      <span className="text-[10px] text-[var(--fg-muted)]">({m.fields.join(", ")})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {diff.logoUploadCount > 0 && (
            <div className="rounded-lg border p-2 text-xs" style={{ borderColor: "var(--border)" }}>
              <span className="text-[var(--accent)]">+ {diff.logoUploadCount} logo file{diff.logoUploadCount === 1 ? "" : "s"}</span> will be committed to <span className="font-mono">public/logo/</span>.
            </div>
          )}

          <div className="rounded-lg border p-2 text-xs" style={{ borderColor: "var(--border)" }}>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Commit message</div>
            <div className="mt-1 font-mono break-all text-[11px]">
              {message.trim() || `admin: update ${region} links`}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-3" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onCancel}
            disabled={saving}
            className="inline-flex h-9 items-center rounded-lg border px-3 text-sm hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
            style={{ borderColor: "var(--border)" }}
          >
            Back to edit
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Publishing…" : "Confirm & publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
