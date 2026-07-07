"use client";

import { useEffect, useState } from "react";
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

async function fetchValidUrlSet(): Promise<Set<string>> {
  const regionsRes = await fetch("/regions.json", { cache: "force-cache" });
  const regionsData = await regionsRes.json();
  const codes: string[] = (regionsData.regions || [])
    .filter((r: { enabled?: boolean }) => r.enabled !== false)
    .map((r: { code: string }) => r.code);

  const files = [
    "/links.json",
    ...codes
      .filter((c) => c !== "USA")
      .map((c) => `/Region-Links/links.${c}.json`),
  ];

  const valid = new Set<string>();
  const results = await Promise.all(
    files.map((f) => fetch(f, { cache: "force-cache" }).then((r) => r.json()).catch(() => null))
  );
  for (const data of results) {
    if (!data?.categories) continue;
    for (const cat of data.categories) {
      for (const site of cat.sites || []) {
        if (site.enabled !== false && site.url) valid.add(site.url);
      }
    }
  }
  return valid;
}

export function RecentlyVisited() {
  const [items, setItems] = useState<Recent[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    function readStored(): Recent[] {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function load() {
      setItems(readStored());
    }

    load();

    fetchValidUrlSet()
      .then((valid) => {
        if (cancelled) return;
        const stored = readStored();
        const kept = stored.filter((r) => valid.has(r.url));
        if (kept.length !== stored.length) {
          try {
            localStorage.setItem(KEY, JSON.stringify(kept));
          } catch {}
        }
        setItems(kept);
      })
      .catch(() => {});

    window.addEventListener("tbcpl-recents-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("tbcpl-recents-changed", load);
    };
  }, []);

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
