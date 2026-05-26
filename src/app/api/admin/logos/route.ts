import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LogoEntry {
  path: string; // "./logo/<category>/<file>" — matches the JSON field
  url: string;  // browser-usable: "/logo/<category>/<file>"
  category: string;
  fileName: string;
}

async function walk(dir: string, rel: string, acc: LogoEntry[]) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const r = path.join(rel, e.name);
    if (e.isDirectory()) {
      await walk(full, r, acc);
    } else if (e.isFile()) {
      const lower = e.name.toLowerCase();
      if (!/\.(png|jpe?g|webp|svg|gif|ico|avif)$/.test(lower)) continue;
      const segs = r.split(path.sep);
      const category = segs.length > 1 ? segs[0] : "";
      acc.push({
        path: `./logo/${r.split(path.sep).join("/")}`,
        url: `/logo/${r.split(path.sep).join("/")}`,
        category,
        fileName: e.name,
      });
    }
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const root = path.join(process.cwd(), "public", "logo");
  const out: LogoEntry[] = [];
  await walk(root, "", out);
  out.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.fileName.localeCompare(b.fileName);
  });
  return NextResponse.json({ items: out });
}
