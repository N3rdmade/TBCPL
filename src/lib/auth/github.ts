import "server-only";
import { Octokit } from "@octokit/rest";
import { env } from "../env";

export interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
}

export interface OAuthExchange {
  token: string;
  scopes: string[];
}

export async function exchangeCodeForToken(code: string): Promise<OAuthExchange> {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID(),
    client_secret: env.GITHUB_CLIENT_SECRET(),
    code,
  });
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`GitHub token exchange failed: ${res.status}`);
  const data = (await res.json()) as { access_token?: string; scope?: string; error?: string };
  if (!data.access_token) throw new Error(`OAuth: ${data.error ?? "no token"}`);
  return { token: data.access_token, scopes: (data.scope ?? "").split(",").filter(Boolean) };
}

export async function getCurrentUser(token: string): Promise<GithubUser> {
  const octo = new Octokit({ auth: token });
  const { data } = await octo.users.getAuthenticated();
  return { login: data.login, id: data.id, avatar_url: data.avatar_url };
}

export type RepoPermission = "admin" | "maintain" | "write" | "triage" | "read" | "none";

export async function getRepoPermission(token: string, username: string): Promise<RepoPermission> {
  const octo = new Octokit({ auth: token });
  const owner = env.REPO_OWNER();
  const repo = env.REPO_NAME();
  try {
    const res = await octo.repos.getCollaboratorPermissionLevel({ owner, repo, username });
    return (res.data.permission as RepoPermission) ?? "none";
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 403 || status === 404) return "none";
    throw err;
  }
}

export function isAdminPermission(p: RepoPermission): p is "admin" | "maintain" | "write" {
  return p === "admin" || p === "maintain" || p === "write";
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID(),
    redirect_uri: `${env.SITE_URL()}/api/auth/github/callback`,
    scope: "repo read:user",
    state,
    allow_signup: "false",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
