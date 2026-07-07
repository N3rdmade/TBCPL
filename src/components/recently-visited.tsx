"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Clock, X } from "lucide-react";
import { normalizeAsset } from "@/lib/utils";

interface Recent {
  name: string;
  url: string;
  logo: string;
  categoryId: string;
  visitedAt: number;
}

const KEY = "tbcpl-recents-v1";
const MAX = 8;

export function addRecent(item: Omit<Recent, "visitedAt">) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    const arr: Recent[] = raw ? JSON.parse(raw) : [];
    const next = [
      { ...item, visitedAt: Date.now() },
      ...arr.filter((r) => r.url !== item.url),
    ].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("tbcpl-recents-changed"));
  } catch {}
}

export function RecentlyVisited({ validUrls }: { validUrls: string[] }) {
  const valid = useMemo(() => new Set(validUrls), [validUrls]);
  const [items, setItems] = useState<Recent[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        const all: Recent[] = raw ? JSON.parse(raw) : [];
        const next = all.filter((r) => valid.has(r.url));
        if (next.length !== all.length) localStorage.setItem(KEY, JSON.stringify(next));
        setItems(next);
      } catch {
        setItems([]);
      }
    }
    load();
    window.addEventListener("tbcpl-recents-changed", load);
    return () => window.removeEventListener("tbcpl-recents-changed", load);
  }, [valid]);

  function clear() {
    localStorage.removeItem(KEY);
    setItems([]);
  }

  if (!mounted || items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          <Clock size={14} /> Recently visited
        </h2>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          <X size={12} /> Clear
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {items.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noreferrer noopener"
            className="tbcpl-card flex shrink-0 items-center gap-2 px-3 py-2 text-sm"
          >
            <Image
              src={normalizeAsset(r.logo)}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
              unoptimized
            />
            <span>{r.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
