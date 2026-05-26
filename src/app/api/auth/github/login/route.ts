import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorizeUrl } from "@/lib/auth/github";
import { setOAuthState } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = randomBytes(16).toString("base64url");
  await setOAuthState(state);
  return NextResponse.redirect(authorizeUrl(state));
}
