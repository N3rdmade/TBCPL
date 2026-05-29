import "server-only";
import { Octokit } from "@octokit/rest";

const g = globalThis as unknown as { __tbcpl_octo?: Map<string, Octokit> };
const cache: Map<string, Octokit> = g.__tbcpl_octo ?? new Map();
g.__tbcpl_octo = cache;

export function getOctokit(token: string): Octokit {
  const hit = cache.get(token);
  if (hit) return hit;
  const octo = new Octokit({ auth: token });
  cache.set(token, octo);
  return octo;
}
