import "server-only";
import Redis from "ioredis";
import { env } from "./env";

let client: Redis | null = null;
let disabled = false;

export function redis(): Redis | null {
  if (disabled) return null;
  if (client) return client;
  const url = env.REDIS_URL();
  if (!url) {
    disabled = true;
    return null;
  }
  client = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
  client.on("error", (e) => {
    console.error("redis error", e.message);
  });
  return client;
}

export async function redisGetJSON<T>(key: string): Promise<T | null> {
  const r = redis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // best-effort
  }
}
