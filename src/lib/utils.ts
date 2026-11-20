import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Logos live in the GitHub repo under public/. Serving them from raw
// means new logos (admin upload → commit → push) appear with no rebuild,
// same as the JSON data. Set NEXT_PUBLIC_ASSET_BASE="" to serve locally
// instead (local dev where you haven't pushed yet).
const ASSET_BASE =
  process.env.NEXT_PUBLIC_ASSET_BASE ??
  "https://raw.githubusercontent.com/N3rdmade/TBCPL/main/public";

export function normalizeAsset(p: string): string {
  if (!p) return p;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const rel = p.startsWith("./") ? p.slice(2) : p.startsWith("/") ? p.slice(1) : p;
  if (!ASSET_BASE) return "/" + rel;
  return `${ASSET_BASE}/${rel}`;
}
