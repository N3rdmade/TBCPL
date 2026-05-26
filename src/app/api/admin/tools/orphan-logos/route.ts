import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionToken } from "@/lib/auth/session";
import { loadAllRegionFiles } from "@/lib/admin/region-scan";
import { db, COLLECTIONS } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LogoOnDisk {
  repoPath: string;     // "public/logo/<cat>/<file>"
  refPath: string;      // "./logo/<cat>/<file>"
  url: string;
  category: string;
  fileName: string;
}

async function walk(dir: string, rel: string, acc: LogoOnDisk[]) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const r = path.join(rel, e.name);
    if (e.isDirectory()) await walk(full, r, acc);
    else if (e.isFile()) {
      const lower = e.name.toLowerCase();
      if (!/\.(png|jpe?g|webp|svg|gif|ico|avif)$/.test(lower)) continue;
      const segs = r.split(path.sep);
      const category = segs.length > 1 ? segs[0] : "";
      const relUrl = r.split(path.sep).join("/");
      acc.push({
        repoPath: `public/logo/${relUrl}`,
        refPath: `./logo/${relUrl}`,
        url: `/logo/${relUrl}`,
        category,
        fileName: e.name,
      });
    }
  }
}

function normRef(s: string): string {
  return s.trim().toLowerCase().replace(/^\.?\//, "").replace(/\\/g, "/");
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  const root = path.join(process.cwd(), "public", "logo");
  const disk: LogoOnDisk[] = [];
  await walk(root, "", disk);

  const { files, errors } = await loadAllRegionFiles(token);

  const referenced = new Set<string>();
  const refsByPath = new Map<string, { region: string; categoryId: string; siteName: string }[]>();
  for (const f of files) {
    for (const cat of f.data.categories) {
      for (const s of cat.sites) {
        const logo = (s.logo ?? "").trim();
        if (!logo || logo.endsWith("/")) continue;
        const key = normRef(logo);
        referenced.add(key);
        const arr = refsByPath.get(key) ?? [];
        arr.push({ region: f.region, categoryId: cat.id, siteName: s.name });
        refsByPath.set(key, arr);
      }
    }
  }

  const orphans = disk.filter((l) => !referenced.has(normRef(l.refPath)));

  const diskKeys = new Set(disk.map((l) => normRef(l.refPath)));
  const broken: { logo: string; refs: { region: string; categoryId: string; siteName: string }[] }[] = [];
  for (const [key, refs] of refsByPath) {
    if (!diskKeys.has(key)) broken.push({ logo: key, refs });
  }

  return NextResponse.json({
    orphans: orphans.map((o) => ({
      repoPath: o.repoPath,
      refPath: o.refPath,
      url: o.url,
      category: o.category,
      fileName: o.fileName,
    })),
    broken,
    scanned: { regions: files.length, logos: disk.length },
    errors,
  });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  let body: { paths?: string[]; message?: string };
  try {
    body = (await req.json()) as { paths?: string[]; message?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const paths = (body.paths ?? []).filter(
    (p) => typeof p === "string" && p.startsWith("public/logo/"),
  );
  if (paths.length === 0) return NextResponse.json({ error: "no_paths" }, { status: 400 });

  // Mark blobs as deleted via createTree with sha:null
  const { Octokit } = await import("@octokit/rest");
  const { env } = await import("@/lib/env");
  const octo = new Octokit({ auth: token });
  const owner = env.REPO_OWNER();
  const repo = env.REPO_NAME();
  const branch = env.REPO_BRANCH();

  const ref = await octo.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const latestCommitSha = ref.data.object.sha;
  const baseCommit = await octo.git.getCommit({ owner, repo, commit_sha: latestCommitSha });

  const newTree = await octo.git.createTree({
    owner,
    repo,
    base_tree: baseCommit.data.tree.sha,
    tree: paths.map((p) => ({ path: p, mode: "100644", type: "blob", sha: null })),
  });

  const message = body.message?.trim() || `admin: delete ${paths.length} orphan logo${paths.length === 1 ? "" : "s"}`;
  const commit = await octo.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.data.sha,
    parents: [latestCommitSha],
  });
  await octo.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: commit.data.sha, force: false });

  try {
    const d = await db();
    await d.collection(COLLECTIONS.auditLog).insertOne({
      at: new Date(),
      actor: auth.session.githubLogin,
      action: "tools.orphan-delete",
      paths,
      commitSha: commit.data.sha,
      commitUrl: commit.data.html_url,
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }

  return NextResponse.json({
    ok: true,
    deleted: paths.length,
    commitSha: commit.data.sha,
    commitUrl: commit.data.html_url,
  });
}
