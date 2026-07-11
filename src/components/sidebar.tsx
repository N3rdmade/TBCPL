"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/constants";
import { CategoryIcon } from "./category-icon";
import { useFavorites } from "@/lib/favorites";

interface Props {
  regionCode: string;
  categories: { id: string; name: string; count: number }[];
}

export function Sidebar({ categories }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const { items: favs, mounted } = useFavorites();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = [...(favs.length ? ["favorites"] : []), ...categories.map((c) => c.id)];
    const sections = ids
      .map((id) => document.getElementById(`cat-${id}`))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id.replace("cat-", ""));
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categories, favs.length]);

  return (
    <aside className="hidden lg:block lg:w-56 lg:shrink-0">
      <div className="sticky top-20 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-muted)]">
          Categories
        </div>

        {mounted && favs.length > 0 && (
          <a
            href="#cat-favorites"
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              active === "favorites"
                ? "bg-[var(--bg-card-hover)] text-[var(--fg)]"
                : "text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]",
            )}
          >
            <span className="flex items-center gap-2">
              <Star size={14} className="text-[var(--accent)]" fill="currentColor" />
              Favorites
            </span>
            <span className="rounded px-1.5 text-[10px] font-mono" style={{ background: "var(--bg-elev)", color: "var(--fg-muted)" }}>
              {favs.length}
            </span>
          </a>
        )}

        {categories.map((c) => {
          const meta = CATEGORY_META[c.id];
          const isActive = active === c.id;
          return (
            <a
              key={c.id}
              href={`#cat-${c.id}`}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-[var(--bg-card-hover)] text-[var(--fg)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]",
              )}
            >
              <span className="flex items-center gap-2">
                <CategoryIcon id={c.id} size={16} />
                <span>{meta?.label ?? c.name}</span>
              </span>
              <span
                className="rounded px-1.5 text-[10px] font-mono"
                style={{ background: "var(--bg-elev)", color: "var(--fg-muted)" }}
              >
                {c.count}
              </span>
            </a>
          );
        })}

        <div className="mt-5 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-muted)]">
          Join us
        </div>
        <div className="px-3 pt-1">
          <a
            href="https://discord.gg/bazxR8fA43"
            target="_blank"
            rel="noreferrer noopener"
            className="mb-2 block overflow-hidden rounded-md transition hover:opacity-90"
          >
            <Image
              src="/socials/discord.png"
              alt="Join our Discord"
              width={400}
              height={120}
              className="h-auto w-full max-w-[160px] social-icon-discord"
              unoptimized
            />
          </a>
          <a
            href="https://www.reddit.com/r/tbcpl/"
            target="_blank"
            rel="noreferrer noopener"
            className="block overflow-hidden rounded-md transition hover:opacity-90"
          >
            <Image
              src="/socials/reddit.png"
              alt="Join our subreddit"
              width={400}
              height={120}
              className="h-auto w-full max-w-[160px] social-icon-reddit"
              unoptimized
            />
          </a>
        </div>
      </div>
    </aside>
  );
}
