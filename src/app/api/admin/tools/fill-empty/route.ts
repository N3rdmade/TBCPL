import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionToken } from "@/lib/auth/session";
import { commitChanges, type FileChange } from "@/lib/github/repo";
import { loadAllRegionFiles } from "@/lib/admin/region-scan";
import { db, COLLECTIONS } from "@/lib/db";
import type { Site } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLACEHOLDER_NAME = "Coming soon — request a site";
const PLACEHOLDER_URL = "https://tbcpl.lol/request";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  let body: { message?: string };
  try {
    body = (await req.json().catch(() => ({}))) as { message?: string };
  } catch {
    body = {};
  }

  const { files } = await loadAllRegionFiles(token);
  const changes: FileChange[] = [];
  const seeded: { region: string; categoryId: string }[] = [];

  for (const f of files) {
    let mutated = false;
    for (const cat of f.data.categories) {
      if (cat.sites.length === 0) {
        const placeholder: Site = {
          name: PLACEHOLDER_NAME,
          url: PLACEHOLDER_URL,
          logo: `./logo/${cat.id}/`,
          status: "new",
        };
        cat.sites.push(placeholder);
        mutated = true;
        seeded.push({ region: f.region, categoryId: cat.id });
      }
    }
    if (mutated) {
      changes.push({
        path: f.path,
        content: JSON.stringify(f.data, null, 2) + "\n",
        encoding: "utf-8",
      });
    }
  }

  if (changes.length === 0) {
    return NextResponse.json({ ok: true, seeded: 0, message: "no empty categories" });
  }

  const message =
    body.message?.trim() ||
    `admin: seed ${seeded.length} empty categor${seeded.length === 1 ? "y" : "ies"} with placeholder`;
  const result = await commitChanges({ token, message, changes });

  try {
    const d = await db();
    await d.collection(COLLECTIONS.auditLog).insertOne({
      at: new Date(),
      actor: auth.session.githubLogin,
      action: "tools.fill-empty",
      seeded,
      commitSha: result.commitSha,
      commitUrl: result.url,
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }

  return NextResponse.json({
    ok: true,
    seeded: seeded.length,
    details: seeded,
    commitSha: result.commitSha,
    commitUrl: result.url,
  });
}
