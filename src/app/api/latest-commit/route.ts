import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CommitResponse {
  sha: string;
  shortSha: string;
  message: string;
  url: string;
  author: string;
  authorAvatar: string;
  date: string;
}

const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const TTL_SECONDS = 12 * 60 * 60;
const CACHE_KEY = "latest-commit";

// In-process hot cache — avoids hitting Mongo on every request within the same instance.
let memCache: { at: number; data: CommitResponse } | null = null;
// Collapses concurrent cold-start fetches into one in-flight promise per instance.
let inflight: Promise<CommitResponse> | null = null;

async function readSharedCache(): Promise<{ at: number; data: CommitResponse } | null> {
  try {
    const d = await db();
    const doc = await d.collection(COLLECTIONS.cache).findOne({ key: CACHE_KEY });
    if (!doc) return null;
    return { at: doc.at, data: doc.data as CommitResponse };
  } catch {
    return null;
  }
}

async function writeSharedCache(entry: { at: number; data: CommitResponse }) {
  try {
    const d = await db();
    await d.collection(COLLECTIONS.cache).updateOne(
      { key: CACHE_KEY },
      { $set: { key: CACHE_KEY, at: entry.at, data: entry.data } },
      { upsert: true },
    );
  } catch {
    // best-effort; mem cache still holds it
  }
}

async function fetchFromGithub(): Promise<CommitResponse> {
  const owner = env.REPO_OWNER();
  const repo = env.REPO_NAME();
  const branch = env.REPO_BRANCH();
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
    {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "tbcpl-site" },
      cache: "no-store",
    },
  );
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  const j = (await r.json()) as {
    sha: string;
    html_url: string;
    commit: { message: string; author: { name: string; date: string } };
    author: { login: string; avatar_url: string } | null;
  };
  return {
    sha: j.sha,
    shortSha: j.sha.slice(0, 7),
    message: j.commit.message.split("\n")[0].slice(0, 140),
    url: j.html_url,
    author: j.author?.login ?? j.commit.author.name,
    authorAvatar: j.author?.avatar_url ?? "",
    date: j.commit.author.date,
  };
}

export async function GET() {
  const now = Date.now();

  // 1. Fast path: in-process cache still warm
  if (memCache && now - memCache.at < TTL_MS) {
    return NextResponse.json(memCache.data, {
      headers: { "Cache-Control": `public, max-age=${TTL_SECONDS}, s-maxage=${TTL_SECONDS}` },
    });
  }

  // 2. Shared path: Mongo cache (survives across instances and cold starts)
  const shared = await readSharedCache();
  if (shared && now - shared.at < TTL_MS) {
    memCache = shared;
    return NextResponse.json(shared.data, {
      headers: { "Cache-Control": `public, max-age=${TTL_SECONDS}, s-maxage=${TTL_SECONDS}` },
    });
  }

  // 3. Cold/stale path: single-flight fetch from GitHub, write back to both caches
  try {
    if (!inflight) {
      inflight = fetchFromGithub().finally(() => {
        // clear after settlement so the next stale window can refetch
        setTimeout(() => {
          inflight = null;
        }, 0);
      });
    }
    const data = await inflight;
    const entry = { at: Date.now(), data };
    memCache = entry;
    await writeSharedCache(entry);
    return NextResponse.json(data, {
      headers: { "Cache-Control": `public, max-age=${TTL_SECONDS}, s-maxage=${TTL_SECONDS}` },
    });
  } catch (e) {
    // Serve stale if we have anything (rate limit / network blip)
    if (shared) {
      return NextResponse.json(shared.data, {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }
    if (memCache) {
      return NextResponse.json(memCache.data, {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "fetch_failed" },
      { status: 502 },
    );
  }
}
