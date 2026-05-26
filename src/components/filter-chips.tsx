"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  categories: { id: string; name: string }[];
}

export function FilterChips({ categories }: Props) {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  useEffect(() => {
    const query = q.trim().toLowerCase();
    const sections = document.querySelectorAll<HTMLElement>("section[data-category]");
    sections.forEach((sec) => {
      const cat = sec.dataset.category!;
      const cards = sec.querySelectorAll<HTMLElement>("a[data-name]");
      let anyVisible = false;
      const catMatch = active.size === 0 || active.has(cat) || cat === "favorites";
      cards.forEach((card) => {
        const name = card.dataset.name ?? "";
        const tags = card.dataset.tags ?? "";
        const queryMatch =
          !query || name.includes(query) || tags.includes(query);
        const show = catMatch && queryMatch;
        card.style.display = show ? "" : "none";
        if (show) anyVisible = true;
      });
      sec.style.display = catMatch && anyVisible ? "" : "none";
    });
  }, [q, active]);

  function toggle(id: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className="sticky top-[57px] z-30 -mx-3 mb-5 border-y px-3 py-2.5 backdrop-blur-xl sm:-mx-4 sm:px-4 md:top-[64px] md:-mx-6 md:mb-6 md:px-6 md:py-3"
      style={{
        background: "color-mix(in oklab, var(--bg) 84%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter on this page…"
            className="h-10 w-full rounded-full border bg-[var(--bg-elev)] pl-10 pr-10 text-sm outline-none transition-colors focus:border-[var(--border-strong)] md:h-11"
            style={{ borderColor: "var(--border)" }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          <button
            type="button"
            data-active={active.size === 0}
            onClick={() => setActive(new Set())}
            className={cn("tbcpl-pill h-8 shrink-0 px-3 text-xs font-semibold")}
          >
            All
          </button>
          {categories.map((c) => {
            const meta = CATEGORY_META[c.id];
            const isActive = active.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                data-active={isActive}
                onClick={() => toggle(c.id)}
                className={cn("tbcpl-pill inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold")}
              >
                <span aria-hidden>{meta?.icon}</span>
                {meta?.label ?? c.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
