"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "tbcpl-favorites-v1";
const EVT = "tbcpl-favorites-changed";

export interface FavoriteItem {
  name: string;
  url: string;
  logo: string;
  categoryId: string;
  starredAt: number;
}

function read(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: FavoriteItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function isStarred(url: string): boolean {
  return read().some((f) => f.url === url);
}

export function toggleStar(item: Omit<FavoriteItem, "starredAt">): boolean {
  const cur = read();
  const exists = cur.some((f) => f.url === item.url);
  if (exists) {
    write(cur.filter((f) => f.url !== item.url));
    return false;
  }
  write([{ ...item, starredAt: Date.now() }, ...cur]);
  return true;
}

export function clearFavorites() {
  write([]);
}

export function useFavorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((item: Omit<FavoriteItem, "starredAt">) => toggleStar(item), []);
  const has = useCallback((url: string) => items.some((f) => f.url === url), [items]);

  return { items, has, toggle, mounted };
}
