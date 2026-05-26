import { NextResponse } from "next/server";
import { exchangeCodeForToken, getCurrentUser, getRepoPermission, isAdminPermission } from "@/lib/auth/github";
import { createSession, consumeOAuthState } from "@/lib/auth/session";
import { db, COLLECTIONS } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  const home = env.SITE_URL();

  if (err) {
    return NextResponse.redirect(`${home}/admin-panel/login?error=${encodeURIComponent(err)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${home}/admin-panel/login?error=missing_code`);
  }
  if (!(await consumeOAuthState(state))) {
    return NextResponse.redirect(`${home}/admin-panel/login?error=bad_state`);
  }

  try {
    const { token } = await exchangeCodeForToken(code);
    const user = await getCurrentUser(token);
    const perm = await getRepoPermission(token, user.login);

    if (!isAdminPermission(perm)) {
      return NextResponse.redirect(`${home}/admin-panel/unauthorized?login=${encodeURIComponent(user.login)}`);
    }

    await createSession({
      githubLogin: user.login,
      githubId: user.id,
      avatarUrl: user.avatar_url,
      token,
      permission: perm,
    });

    // Upsert into admins collection
    const d = await db();
    await d.collection(COLLECTIONS.admins).updateOne(
      { githubLogin: user.login },
      {
        $set: {
          githubLogin: user.login,
          avatarUrl: user.avatar_url,
          permission: perm,
          lastLoginAt: new Date(),
        },
        $setOnInsert: { addedAt: new Date() },
      },
      { upsert: true },
    );

    return NextResponse.redirect(`${home}/admin-panel`);
  } catch (e) {
    console.error("OAuth callback error:", e);
    return NextResponse.redirect(`${home}/admin-panel/login?error=callback_failed`);
  }
}
