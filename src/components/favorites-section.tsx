"use client";

import Image from "next/image";
import { Star, X } from "lucide-react";
import { useFavorites, toggleStar, clearFavorites } from "@/lib/favorites";
import { normalizeAsset } from "@/lib/utils";

export function FavoritesSection() {
  const { items, mounted } = useFavorites();
  if (!mounted || items.length === 0) return null;

  return (
    <section
      id="cat-favorites"
      data-category="favorites"
      className="mb-10 scroll-mt-32 rounded-2xl border p-4 md:p-5"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, transparent), transparent 60%), var(--bg-card)",
        borderColor: "var(--border-strong)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold md:text-xl">
          <Star size={18} className="text-[var(--accent)]" fill="currentColor" />
          Your favorites
          <span
            className="ml-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: "var(--bg-elev)", color: "var(--fg-muted)" }}
          >
            {items.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => {
            if (confirm("Clear all favorites?")) clearFavorites();
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]"
        >
          <X size={12} /> Clear all
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {items.map((fav) => (
          <a
            key={fav.url}
            href={fav.url}
            target="_blank"
            rel="noreferrer noopener"
            data-name={fav.name.toLowerCase()}
            data-category="favorites"
            className="tbcpl-card group relative flex aspect-[5/3] flex-col items-center justify-center gap-1 p-2.5 hover:tbcpl-glow"
            title={fav.name}
          >
            <button
              type="button"
              aria-label="Unstar"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleStar(fav);
              }}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md text-[var(--accent)] hover:bg-[var(--bg-elev)]"
            >
              <Star size={12} fill="currentColor" />
            </button>
            <div className="flex h-10 w-full items-center justify-center px-2">
              <Image
                src={normalizeAsset(fav.logo)}
                alt={fav.name}
                width={120}
                height={40}
                className="max-h-10 w-auto object-contain"
                unoptimized
              />
            </div>
            <div className="truncate text-[10px] text-[var(--fg-muted)]">{fav.name}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
