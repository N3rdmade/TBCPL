"use client";

import { useEffect, useMemo, useState } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Save, Loader2, ExternalLink } from "lucide-react";
import type { Region } from "@/lib/types";
import { FlagIcon } from "../flag-icon";

export function RegionsEditor({ initial }: { initial: Region[] }) {
  const [regions, setRegions] = useState<Region[]>(initial);
  const [original] = useState(() => JSON.stringify(initial));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ url: string; sha: string } | null>(null);

  const dirty = useMemo(() => JSON.stringify(regions) !== original, [regions, original]);

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

  const update = (idx: number, patch: Partial<Region>) =>
    setRegions((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const remove = (idx: number) =>
    setRegions((prev) => prev.filter((_, i) => i !== idx));

  const add = () => {
    const code = window.prompt("Region code (e.g. MEXICO):")?.trim().toUpperCase();
    if (!code) return;
    const name = window.prompt("Display name:")?.trim();
    if (!name) return;
    const flag = window.prompt("Flag emoji:")?.trim() ?? "";
    setRegions((prev) => [...prev, { code, name, flag, enabled: true }]);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = regions.findIndex((r) => r.code === active.id);
    const newIdx = regions.findIndex((r) => r.code === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setRegions((prev) => arrayMove(prev, oldIdx, newIdx));
  };

  const publish = async () => {
    setSaving(true);
    setError(null);
    setLastResult(null);
    try {
      const r = await fetch("/api/admin/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regions, message: message.trim() || undefined }),
      });
      const j = (await r.json()) as { ok?: boolean; commitSha?: string; url?: string; error?: string; detail?: string };
      if (!r.ok || !j.ok) throw new Error(j.detail ?? j.error ?? `HTTP ${r.status}`);
      setLastResult({ url: j.url!, sha: j.commitSha! });
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Regions</h1>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-[var(--accent)]">Unsaved</span>}
          <button
            onClick={add}
            className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm hover:bg-[var(--bg-card-hover)]"
            style={{ borderColor: "var(--border)" }}
          >
            <Plus size={14} /> Region
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

      <p className="text-xs text-[var(--fg-muted)]">
        Drag rows to reorder — the order here is the display order in the country picker.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={regions.map((r) => r.code)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {regions.map((r, i) => (
              <RegionRow
                key={r.code}
                region={r}
                index={i}
                onUpdate={(patch) => update(i, patch)}
                onRemove={() => {
                  if (window.confirm(`Remove ${r.name} from regions list?`)) remove(i);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div
        className="sticky bottom-4 z-20 flex flex-col gap-2 rounded-2xl border p-3 backdrop-blur-xl md:flex-row md:items-center"
        style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--bg) 88%, transparent)" }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="admin: update regions"
          className="h-9 flex-1 rounded-lg border px-3 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
        />
        <button
          onClick={publish}
          disabled={!dirty || saving}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Publishing…" : "Publish to GitHub"}
        </button>
      </div>

      <p className="text-xs text-[var(--fg-muted)]">
        Disabling a region keeps its links file on disk but hides it from the site.
      </p>
    </div>
  );
}

function RegionRow({
  region,
  index,
  onUpdate,
  onRemove,
}: {
  region: Region;
  index: number;
  onUpdate: (patch: Partial<Region>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: region.code,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderColor: "var(--border)",
    background: "var(--bg-card)",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-2 rounded-2xl border p-3"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab touch-none rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]"
      >
        <GripVertical size={16} />
      </button>
      <span
        className="w-7 text-center font-mono text-[10px] text-[var(--fg-muted)]"
        title="Display order"
      >
        {index + 1}
      </span>
      <div className="flex items-center gap-1">
        <span className="grid h-6 w-6 place-items-center">
          <FlagIcon code={region.flag} size={16} />
        </span>
        <input
          value={region.flag}
          onChange={(e) => onUpdate({ flag: e.target.value.toLowerCase() })}
          className="h-9 w-16 rounded-lg border bg-transparent px-2 text-center font-mono text-xs"
          style={{ borderColor: "var(--border)" }}
          placeholder="us"
          aria-label="Flag code (ISO 2-letter)"
        />
      </div>
      <input
        value={region.code}
        onChange={(e) => onUpdate({ code: e.target.value.toUpperCase() })}
        className="h-9 w-28 rounded-lg border bg-transparent px-2 font-mono text-xs"
        style={{ borderColor: "var(--border)" }}
        aria-label="Code"
      />
      <input
        value={region.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="h-9 min-w-0 flex-1 rounded-lg border bg-transparent px-2 text-sm"
        style={{ borderColor: "var(--border)" }}
        aria-label="Name"
      />
      <label className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
        <input
          type="checkbox"
          checked={region.enabled !== false}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Enabled
      </label>
      <button
        onClick={onRemove}
        aria-label="Remove"
        className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--danger,#f87171)]"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
