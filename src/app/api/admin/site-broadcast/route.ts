import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionToken } from "@/lib/auth/session";
import { commitChanges, getRepoFile, type FileChange } from "@/lib/github/repo";
import { linksPathForRegion } from "@/lib/admin/paths";
import { db, COLLECTIONS } from "@/lib/db";
import type { LinksData, Site, SiteStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: SiteStatus[] = ["ok", "new", "down", "trusted"];

interface Target {
  region: string;
  categoryId: string;
}

interface BaseSite {
  name: string;
  url: string;
  logo: string;
  status?: SiteStatus;
  description?: string;
  tags?: string[];
  enabled?: boolean;
}

function sanitizeSite(input: BaseSite): Site | null {
  if (!input.name?.trim() || !input.url?.trim() || typeof input.logo !== "string") return null;
  const site: Site = { name: input.name.trim(), url: input.url.trim(), logo: input.logo };
  if (typeof input.description === "string" && input.description) site.description = input.description;
  if (input.enabled === false) site.enabled = false;
  if (Array.isArray(input.tags)) {
    const tags = input.tags.filter((t): t is string => typeof t === "string" && !!t);
    if (tags.length) site.tags = tags;
  }
  if (input.status && (STATUSES as string[]).includes(input.status)) site.status = input.status;
  return site;
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  let body: {
    baseSite?: BaseSite;
    addToTargets?: Target[];
    removeFromTargets?: Target[];
    message?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const base = body.baseSite ? sanitizeSite(body.baseSite) : null;
  if (!base) return NextResponse.json({ error: "missing_base_site" }, { status: 400 });

  const add = (body.addToTargets ?? []).filter(
    (t) => t && typeof t.region === "string" && typeof t.categoryId === "string",
  );
  const remove = (body.removeFromTargets ?? []).filter(
    (t) => t && typeof t.region === "string" && typeof t.categoryId === "string",
  );
  if (add.length === 0 && remove.length === 0) {
    return NextResponse.json({ error: "no_targets" }, { status: 400 });
  }

  // Group all touched regions
  const regionSet = new Set<string>();
  for (const t of add) regionSet.add(t.region.toUpperCase());
  for (const t of remove) regionSet.add(t.region.toUpperCase());

  const changes: FileChange[] = [];
  const added: Target[] = [];
  const removed: Target[] = [];
  const skipped: string[] = [];

  for (const region of regionSet) {
    const path = linksPathForRegion(region);
    const raw = await getRepoFile({ token, path });
    if (!raw) {
      skipped.push(`${region}: file_missing`);
      continue;
    }
    let parsed: LinksData;
    try {
      parsed = JSON.parse(raw) as LinksData;
    } catch {
      skipped.push(`${region}: invalid_json`);
      continue;
    }
    if (!Array.isArray(parsed.categories)) {
      skipped.push(`${region}: malformed`);
      continue;
    }

    let mutated = false;

    // Removals first
    for (const t of remove) {
      if (t.region.toUpperCase() !== region) continue;
      const cat = parsed.categories.find((c) => c.id === t.categoryId);
      if (!cat) {
        skipped.push(`${region}/${t.categoryId}: missing_category`);
        continue;
      }
      const before = cat.sites.length;
      cat.sites = cat.sites.filter(
        (s) => s.url.trim().toLowerCase() !== base.url.toLowerCase(),
      );
      if (cat.sites.length !== before) {
        removed.push(t);
        mutated = true;
      }
    }

    // Additions next
    for (const t of add) {
      if (t.region.toUpperCase() !== region) continue;
      const cat = parsed.categories.find((c) => c.id === t.categoryId);
      if (!cat) {
        skipped.push(`${region}/${t.categoryId}: missing_category`);
        continue;
      }
      const dup = cat.sites.some(
        (s) => s.url.trim().toLowerCase() === base.url.toLowerCase(),
      );
      if (dup) {
        skipped.push(`${region}/${t.categoryId}: duplicate_url`);
        continue;
      }
      // Re-target the logo path's category folder so it matches this target.
      const retargetedLogo = base.logo.replace(
        /^(\.\/logo\/)([^/]+)(\/.*)$/,
        (_m, p1, _p2, p3) => `${p1}${t.categoryId}${p3}`,
      );
      const site: Site = { ...base, logo: retargetedLogo };
      cat.sites.push(site);
      added.push(t);
      mutated = true;
    }

    if (mutated) {
      changes.push({
        path,
        content: JSON.stringify(parsed, null, 2) + "\n",
        encoding: "utf-8",
      });
    }
  }

  if (changes.length === 0) {
    return NextResponse.json(
      { ok: false, error: "nothing_to_commit", skipped },
      { status: 200 },
    );
  }

  const summary: string[] = [];
  if (added.length) summary.push(`+${added.length}`);
  if (removed.length) summary.push(`-${removed.length}`);
  const message =
    body.message?.trim() ||
    `admin: broadcast "${base.name}" (${summary.join(" ")})`;
  const result = await commitChanges({ token, message, changes });

  try {
    const d = await db();
    await d.collection(COLLECTIONS.auditLog).insertOne({
      at: new Date(),
      actor: auth.session.githubLogin,
      action: "site.broadcast",
      url: base.url,
      added,
      removed,
      skipped,
      commitSha: result.commitSha,
      commitUrl: result.url,
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }

  return NextResponse.json({
    ok: true,
    added,
    removed,
    skipped,
    commitSha: result.commitSha,
    commitUrl: result.url,
  });
}
