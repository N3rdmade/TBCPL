import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { encrypt, decrypt } from "../crypto";
import { env } from "../env";

const COOKIE = "tbcpl_sid";
const TTL_DAYS = 7;
const TTL_SECONDS = TTL_DAYS * 86_400;
const ALG = "HS256";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.SESSION_SECRET());
}

export interface SessionRecord {
  githubLogin: string;
  githubId: number;
  avatarUrl: string;
  tokenEnc: string; // encrypted github access token
  permission: "admin" | "maintain" | "write";
  createdAt: Date;
  expiresAt: Date;
}

export interface SessionUser {
  githubLogin: string;
  avatarUrl: string;
  permission: SessionRecord["permission"];
}

interface JWTPayload {
  githubLogin: string;
  githubId: number;
  avatarUrl: string;
  tokenEnc: string;
  permission: SessionRecord["permission"];
}

export async function createSession(input: {
  githubLogin: string;
  githubId: number;
  avatarUrl: string;
  token: string;
  permission: SessionRecord["permission"];
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TTL_SECONDS;

  const payload: JWTPayload = {
    githubLogin: input.githubLogin,
    githubId: input.githubId,
    avatarUrl: input.avatarUrl,
    tokenEnc: encrypt(input.token),
    permission: input.permission,
  };

  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secretKey());

  const jar = cookies();
  jar.set({
    name: COOKIE,
    value: jwt,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp * 1000),
  });
  return jwt;
}

export async function getSession(): Promise<SessionRecord | null> {
  const jar = cookies();
  const jwt = jar.get(COOKIE)?.value;
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, secretKey(), { algorithms: [ALG] });
    const iat = typeof payload.iat === "number" ? payload.iat : Math.floor(Date.now() / 1000);
    const exp = typeof payload.exp === "number" ? payload.exp : iat + TTL_SECONDS;
    return {
      githubLogin: String(payload.githubLogin ?? ""),
      githubId: Number(payload.githubId ?? 0),
      avatarUrl: String(payload.avatarUrl ?? ""),
      tokenEnc: String(payload.tokenEnc ?? ""),
      permission: payload.permission as SessionRecord["permission"],
      createdAt: new Date(iat * 1000),
      expiresAt: new Date(exp * 1000),
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const rec = await getSession();
  if (!rec) return null;
  return {
    githubLogin: rec.githubLogin,
    avatarUrl: rec.avatarUrl,
    permission: rec.permission,
  };
}

export async function getSessionToken(): Promise<string | null> {
  const rec = await getSession();
  if (!rec) return null;
  try {
    return decrypt(rec.tokenEnc);
  } catch {
    return null;
  }
}

export async function destroySession() {
  const jar = cookies();
  jar.delete(COOKIE);
}

const STATE_COOKIE = "tbcpl_oauth_state";

export async function setOAuthState(state: string) {
  const jar = cookies();
  jar.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function consumeOAuthState(received: string): Promise<boolean> {
  const jar = cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  return !!expected && expected === received;
}
