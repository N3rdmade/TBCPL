import "server-only";
import { getOctokit } from "./client";
import { env } from "../env";

export interface FileChange {
  path: string;            // repo-relative, e.g. "public/links.json"
  content: string;         // UTF-8 string OR base64 (if binary, set encoding="base64")
  encoding?: "utf-8" | "base64";
}

export interface CommitResult {
  commitSha: string;
  treeSha: string;
  url: string;
}

export async function commitChanges(opts: {
  token: string;
  message: string;
  changes: FileChange[];
  authorName?: string;
  authorEmail?: string;
}): Promise<CommitResult> {
  if (opts.changes.length === 0) throw new Error("No changes to commit");

  const octo = getOctokit(opts.token);
  const owner = env.REPO_OWNER();
  const repo = env.REPO_NAME();
  const branch = env.REPO_BRANCH();

  // 1. Latest commit sha on branch
  const ref = await octo.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const latestCommitSha = ref.data.object.sha;

  // 2. Base tree from that commit
  const baseCommit = await octo.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
  const baseTreeSha = baseCommit.data.tree.sha;

  // 3. Upload each file as a blob
  const blobs = await Promise.all(
    opts.changes.map(async (c) => {
      const blob = await octo.git.createBlob({
        owner,
        repo,
        content: c.content,
        encoding: c.encoding ?? "utf-8",
      });
      return { path: c.path, sha: blob.data.sha };
    }),
  );

  // 4. New tree
  const newTree = await octo.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: blobs.map((b) => ({
      path: b.path,
      mode: "100644",
      type: "blob",
      sha: b.sha,
    })),
  });

  // 5. Commit
  const commit = await octo.git.createCommit({
    owner,
    repo,
    message: opts.message,
    tree: newTree.data.sha,
    parents: [latestCommitSha],
    author:
      opts.authorName && opts.authorEmail
        ? { name: opts.authorName, email: opts.authorEmail, date: new Date().toISOString() }
        : undefined,
  });

  // 6. Move ref
  await octo.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.data.sha,
    force: false,
  });

  return {
    commitSha: commit.data.sha,
    treeSha: newTree.data.sha,
    url: commit.data.html_url,
  };
}

export async function getRepoFile(opts: { token: string; path: string }): Promise<string | null> {
  const octo = getOctokit(opts.token);
  try {
    const res = await octo.repos.getContent({
      owner: env.REPO_OWNER(),
      repo: env.REPO_NAME(),
      path: opts.path,
      ref: env.REPO_BRANCH(),
    });
    if (Array.isArray(res.data) || res.data.type !== "file") return null;
    const content = res.data.content;
    return Buffer.from(content, "base64").toString("utf-8");
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}
