import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionRecord } from "./session";

export async function requireAdmin(): Promise<
  { ok: true; session: SessionRecord } | { ok: false; res: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}
