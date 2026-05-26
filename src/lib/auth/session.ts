import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db, COLLECTIONS } from "../db";
import { encrypt, decrypt } from "../crypto";

const COOKIE = "tbcpl_sid";
const TTL_DAYS = 7;

export interface SessionRecord {
  sid: string;
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

export async function createSession(input: {
  githubLogin: string;
  githubId: number;
  avatarUrl: string;
  token: string;
  permission: SessionRecord["permission"];
}): Promise<string> {
  const sid = randomBytes(24).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_DAYS * 86_400_000);
  const d = await db();
  await d.collection<SessionRecord>(COLLECTIONS.sessions).insertOne({
    sid,
    githubLogin: input.githubLogin,
    githubId: input.githubId,
    avatarUrl: input.avatarUrl,
    tokenEnc: encrypt(input.token),
    permission: input.permission,
    createdAt: now,
    expiresAt,
  });

  const jar = await cookies();
  jar.set({
    name: COOKIE,
    value: sid,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return sid;
}

export async function getSession(): Promise<SessionRecord | null> {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (!sid) return null;
  const d = await db();
  const rec = await d.collection<SessionRecord>(COLLECTIONS.sessions).findOne({ sid });
  if (!rec) return null;
  if (rec.expiresAt < new Date()) {
    await d.collection(COLLECTIONS.sessions).deleteOne({ sid });
    return null;
  }
  return rec;
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
  return decrypt(rec.tokenEnc);
}

export async function destroySession() {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (sid) {
    const d = await db();
    await d.collection(COLLECTIONS.sessions).deleteOne({ sid });
  }
  jar.delete(COOKIE);
}

const STATE_COOKIE = "tbcpl_oauth_state";

export async function setOAuthState(state: string) {
  const jar = await cookies();
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
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  return !!expected && expected === received;
}
