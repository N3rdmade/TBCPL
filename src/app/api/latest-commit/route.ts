import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { redisGetJSON, redisSetJSON } from "@/lib/redis";

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

const TTL_SECONDS = 2 * 60 * 60; // 2 hours
const TTL_MS = TTL_SECONDS * 1000;
const CACHE_KEY = "tbcpl:latest-commit";

// In-process hot cache — avoids hitting Redis on every request within the same instance.
let memCache: { at: number; data: CommitResponse } | null = null;
// Collapses concurrent cold-start fetches into one in-flight promise per instance.
let inflight: Promise<CommitResponse> | null = null;

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

  // 2. Shared path: Redis (survives across instances and cold starts)
  const shared = await redisGetJSON<CommitResponse>(CACHE_KEY);
  if (shared) {
    memCache = { at: now, data: shared };
    return NextResponse.json(shared, {
      headers: { "Cache-Control": `public, max-age=${TTL_SECONDS}, s-maxage=${TTL_SECONDS}` },
    });
  }

  // 3. Cold/stale path: single-flight fetch from GitHub, write back to both caches
  try {
    if (!inflight) {
      inflight = fetchFromGithub().finally(() => {
        inflight = null;
      });
    }
    const data = await inflight;
    memCache = { at: Date.now(), data };
    await redisSetJSON(CACHE_KEY, data, TTL_SECONDS);
    return NextResponse.json(data, {
      headers: { "Cache-Control": `public, max-age=${TTL_SECONDS}, s-maxage=${TTL_SECONDS}` },
    });
  } catch (e) {
    // Serve mem cache stale if we have anything (rate limit / network blip)
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
