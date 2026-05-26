import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionToken } from "@/lib/auth/session";
import { commitChanges, type FileChange } from "@/lib/github/repo";
import { linksPathForRegion, logoPathForCategory } from "@/lib/admin/paths";
import { db, COLLECTIONS } from "@/lib/db";
import type { Category, Site, SiteStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: SiteStatus[] = ["ok", "new", "down", "trusted"];

interface LogoUpload {
  categoryId: string;
  fileName: string;
  contentBase64: string; // raw base64, no data: prefix
}

interface PublishBody {
  region: string;
  categories: Category[];
  message?: string;
  logoUploads?: LogoUpload[];
}

function sanitizeSite(s: unknown): Site | null {
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  if (typeof o.name !== "string" || !o.name.trim()) return null;
  if (typeof o.url !== "string" || !o.url.trim()) return null;
  if (typeof o.logo !== "string") return null;

  const site: Site = { name: o.name.trim(), url: o.url.trim(), logo: o.logo };
  if (typeof o.description === "string" && o.description) site.description = o.description;
  if (typeof o.enabled === "boolean") site.enabled = o.enabled;
  if (Array.isArray(o.tags)) {
    const tags = o.tags.filter((t): t is string => typeof t === "string" && t.length > 0);
    if (tags.length) site.tags = tags;
  }
  if (typeof o.status === "string" && (STATUSES as string[]).includes(o.status)) {
    site.status = o.status as SiteStatus;
  }
  return site;
}

function sanitizeCategory(c: unknown): Category | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id.trim()) return null;
  if (typeof o.name !== "string" || !o.name.trim()) return null;
  if (!Array.isArray(o.sites)) return null;
  const sites = o.sites.map(sanitizeSite).filter((s): s is Site => s !== null);
  return { id: o.id.trim(), name: o.name.trim(), sites };
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const region = (body.region ?? "").toUpperCase();
  if (!region) return NextResponse.json({ error: "missing_region" }, { status: 400 });
  if (!Array.isArray(body.categories)) {
    return NextResponse.json({ error: "missing_categories" }, { status: 400 });
  }

  const cleanCategories = body.categories
    .map(sanitizeCategory)
    .filter((c): c is Category => c !== null);

  if (cleanCategories.length === 0) {
    return NextResponse.json({ error: "no_valid_categories" }, { status: 400 });
  }

  const changes: FileChange[] = [];

  // Logo blobs first so we can rewrite site.logo to point at them
  const logoPathByKey = new Map<string, string>();
  if (Array.isArray(body.logoUploads)) {
    for (const up of body.logoUploads) {
      if (!up || typeof up.categoryId !== "string" || typeof up.fileName !== "string") continue;
      if (typeof up.contentBase64 !== "string" || !up.contentBase64) continue;
      const path = logoPathForCategory(up.categoryId, up.fileName);
      changes.push({ path, content: up.contentBase64, encoding: "base64" });
      logoPathByKey.set(`${up.categoryId}/${up.fileName}`, `./logo/${up.categoryId}/${up.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    }
  }

  // Rewrite site.logo when client used a "pending://<categoryId>/<fileName>" placeholder
  for (const cat of cleanCategories) {
    for (const s of cat.sites) {
      if (s.logo.startsWith("pending://")) {
        const key = s.logo.slice("pending://".length);
        const resolved = logoPathByKey.get(key);
        if (resolved) s.logo = resolved;
      }
    }
  }

  const linksPath = linksPathForRegion(region);
  const linksJson = JSON.stringify({ categories: cleanCategories }, null, 2) + "\n";
  changes.push({ path: linksPath, content: linksJson, encoding: "utf-8" });

  const message =
    body.message?.trim() ||
    `admin: update ${region} links (${cleanCategories.length} categories)`;

  try {
    const result = await commitChanges({
      token,
      message,
      changes,
      authorName: auth.session.githubLogin,
      authorEmail: `${auth.session.githubId}+${auth.session.githubLogin}@users.noreply.github.com`,
    });

    // Audit log
    try {
      const d = await db();
      await d.collection(COLLECTIONS.auditLog).insertOne({
        at: new Date(),
        actor: auth.session.githubLogin,
        action: "publish.links",
        region,
        categoryCount: cleanCategories.length,
        logoCount: logoPathByKey.size,
        commitSha: result.commitSha,
        commitUrl: result.url,
        message,
      });
    } catch (e) {
      console.error("audit log write failed", e);
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("publish failed", e);
    const msg = e instanceof Error ? e.message : "commit_failed";
    return NextResponse.json({ error: "commit_failed", detail: msg }, { status: 500 });
  }
}
