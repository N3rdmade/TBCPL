import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getLinksForRegion, getRegions } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const region = (url.searchParams.get("region") ?? "USA").toUpperCase();

  const regions = await getRegions();
  const exists = regions.some((r) => r.code === region);
  if (!exists) {
    return NextResponse.json({ error: "unknown_region" }, { status: 404 });
  }

  const data = await getLinksForRegion(region);
  return NextResponse.json({ region, categories: data.categories });
}
