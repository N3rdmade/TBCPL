"use client";

import Image from "next/image";
import { useState } from "react";
import { Copy, ExternalLink, Flag, Check, Star } from "lucide-react";
import type { Site } from "@/lib/types";
import { normalizeAsset, cn } from "@/lib/utils";
import { addRecent } from "./recently-visited";
import { useFavorites } from "@/lib/favorites";

interface Props {
  site: Site;
  categoryId: string;
}

function statusColor(status?: Site["status"]) {
  switch (status) {
    case "down": return "var(--danger)";
    case "new": return "var(--success)";
    case "trusted": return "var(--accent)";
    default: return null;
  }
}

export function SiteCard({ site, categoryId }: Props) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { has, toggle, mounted } = useFavorites();
  const starred = mounted && has(site.url);
  const color = statusColor(site.status);

  async function copyUrl(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(site.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  function star(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle({ name: site.name, url: site.url, logo: site.logo, categoryId });
  }

  let host = "";
  try { host = new URL(site.url).hostname.replace(/^www\./, ""); } catch {}

  return (
    <a
      href={site.url}
      target="_blank"
      rel="noreferrer noopener"
      onClick={() => addRecent({ name: site.name, url: site.url, logo: site.logo, categoryId })}
      data-name={site.name.toLowerCase()}
      data-category={categoryId}
      data-tags={(site.tags ?? []).join(",").toLowerCase()}
      className={cn(
        "tbcpl-card group relative flex aspect-[5/3] flex-col items-center justify-center gap-1.5 overflow-hidden p-3",
        "transition-transform duration-200 will-change-transform hover:-translate-y-0.5 hover:tbcpl-glow",
        starred && "ring-1 ring-[var(--accent)]/40",
      )}
      title={site.name}
    >
      {/* gradient halo on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 60%)",
        }}
      />

      {/* Status badge (top-left) */}
      {site.status && color && (
        <span
          className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-wider"
          style={{ background: "color-mix(in oklab, " + color + " 18%, transparent)", color, border: `1px solid ${color}` }}
        >
          {site.status === "down" && <span className="pulse-dot h-1 w-1 rounded-full" style={{ background: color }} />}
          {site.status}
        </span>
      )}

      {/* Star button (top-right, always visible) */}
      <button
        type="button"
        aria-label={starred ? "Unstar" : "Star"}
        aria-pressed={starred}
        onClick={star}
        className={cn(
          "absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-md transition-all",
          starred
            ? "text-[var(--accent)] opacity-100"
            : "text-[var(--fg-muted)] opacity-60 hover:opacity-100 group-hover:opacity-100",
          "hover:bg-[var(--bg-elev)] hover:text-[var(--accent)]",
        )}
      >
        <Star size={14} fill={starred ? "currentColor" : "none"} strokeWidth={2} />
      </button>

      {/* Secondary actions (bottom-right) — always visible on touch, hover on desktop */}
      <div
        className={cn(
          "absolute bottom-1.5 right-1.5 z-10 flex gap-1",
          "opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy URL"}
          onClick={copyUrl}
          className="grid h-6 w-6 place-items-center rounded-md bg-[var(--bg-elev)]/70 text-[var(--fg-muted)] backdrop-blur hover:text-[var(--fg)]"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>

      <div className="relative flex h-14 w-full items-center justify-center px-4">
        {imgError ? (
          <div className="line-clamp-2 text-center text-sm font-semibold">{site.name}</div>
        ) : (
          <Image
            src={normalizeAsset(site.logo)}
            alt={site.name}
            width={160}
            height={64}
            className="max-h-14 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            unoptimized
            onError={() => setImgError(true)}
          />
        )}
      </div>

      <div className="z-10 flex max-w-full items-center gap-1 truncate text-[10px] text-[var(--fg-muted)]">
        <ExternalLink size={9} className="shrink-0" />
        <span className="truncate">{host}</span>
      </div>
    </a>
  );
}
