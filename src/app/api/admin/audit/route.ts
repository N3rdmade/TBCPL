import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db, COLLECTIONS } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  const d = await db();
  const docs = await d
    .collection(COLLECTIONS.auditLog)
    .find({})
    .sort({ at: -1 })
    .limit(limit)
    .toArray();

  const items = docs.map((doc) => {
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
  });
  return NextResponse.json({ items });
}
