"use client";

import { useState } from "react";
import { Link2, Tag, Target, Star, Plus, X, Send } from "lucide-react";
import { useRegions } from "@/components/region-context";
import { CATEGORY_META } from "@/lib/constants";

interface TargetRow {
  id: number;
  region: string;
  category: string;
}

const SUBMIT_URL = "/api/site-requests";

export function RequestForm() {
  const { regions } = useRegions();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [targets, setTargets] = useState<TargetRow[]>([{ id: 1, region: "", category: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTarget() {
    setTargets((t) => [...t, { id: Date.now(), region: "", category: "" }]);
  }
  function removeTarget(id: number) {
    setTargets((t) => (t.length > 1 ? t.filter((r) => r.id !== id) : t));
  }
  function updateTarget(id: number, key: "region" | "category", value: string) {
    setTargets((t) => t.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valid = targets.filter((t) => t.region && t.category).map((t) => ({ region: t.region, categoryId: t.category }));
    if (!valid.length) {
      setError("Pick at least one region + section.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: url,
          siteName: name,
          siteFeature: why,
          targets: valid,
          submittedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Submission failed");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="tbcpl-card p-8 text-center">
        <div className="mb-3 text-4xl">✅</div>
        <h3 className="text-lg font-bold">Request sent successfully!</h3>
        <p className="mt-2 text-[var(--fg-muted)]">Thanks for your submission. We&apos;ll review it and add quality sites to the list.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field icon={<Link2 size={14} />} label="Site URL">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="tbcpl-card w-full bg-[var(--bg-elev)] px-4 py-2.5 text-sm outline-none focus:border-[var(--border-strong)]"
        />
      </Field>

      <Field icon={<Tag size={14} />} label="Site Name">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Awesome Streaming Site"
          className="tbcpl-card w-full bg-[var(--bg-elev)] px-4 py-2.5 text-sm outline-none focus:border-[var(--border-strong)]"
        />
      </Field>

      <div>
        <Label icon={<Target size={14} />}>
          Where should it go?{" "}
          <span className="font-normal text-[var(--fg-muted)]">(add as many region + section pairs as you like)</span>
        </Label>
        <div className="space-y-2">
          {targets.map((row) => (
            <div key={row.id} className="flex flex-col gap-2 sm:flex-row">
              <select
                required
                value={row.region}
                onChange={(e) => updateTarget(row.id, "region", e.target.value)}
                className="tbcpl-card min-w-0 flex-1 bg-[var(--bg-elev)] px-3 py-2.5 text-sm outline-none focus:border-[var(--border-strong)]"
              >
                <option value="">Select region</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>{r.flag} {r.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <select
                  required
                  value={row.category}
                  onChange={(e) => updateTarget(row.id, "category", e.target.value)}
                  className="tbcpl-card min-w-0 flex-1 bg-[var(--bg-elev)] px-3 py-2.5 text-sm outline-none focus:border-[var(--border-strong)]"
                >
                  <option value="">Select section</option>
                  {Object.entries(CATEGORY_META).map(([id, m]) => (
                    <option key={id} value={id}>{m.icon} {m.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Remove"
                  disabled={targets.length <= 1}
                  onClick={() => removeTarget(row.id)}
                  className="tbcpl-pill h-auto shrink-0 px-3 disabled:opacity-30"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addTarget}
          className="tbcpl-pill mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus size={14} /> Add another region/section
        </button>
      </div>

      <Field icon={<Star size={14} />} label="Why should we add it?">
        <textarea
          required
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          rows={4}
          placeholder="Tell us what makes this site special… (large library, fast streaming, mobile-friendly, etc.)"
          className="tbcpl-card w-full resize-y bg-[var(--bg-elev)] px-4 py-2.5 text-sm outline-none focus:border-[var(--border-strong)]"
        />
      </Field>

      {error && (
        <div className="rounded-lg border px-4 py-2.5 text-sm" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold disabled:opacity-50 sm:w-auto"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        <Send size={14} /> {submitting ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}

function Label({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
      <span className="text-[var(--accent)]">{icon}</span> {children}
    </label>
  );
}

function Field({ children, label, icon }: { children: React.ReactNode; label: string; icon: React.ReactNode }) {
  return (
    <div>
      <Label icon={icon}>{label}</Label>
      {children}
    </div>
  );
}
