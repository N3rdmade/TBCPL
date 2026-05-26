import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard cap
const ALLOWED = /^image\/(png|jpe?g|svg\+xml|gif|webp|x-icon|avif|vnd\.microsoft\.icon)$/i;

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("svg")) return ".svg";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("gif")) return ".gif";
  if (m.includes("webp")) return ".webp";
  if (m.includes("avif")) return ".avif";
  if (m.includes("icon")) return ".ico";
  return ".png";
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const url = body.url?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "TBCPL-Admin/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "fetch_failed", detail: e instanceof Error ? e.message : "unknown" },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json({ error: "fetch_failed", detail: `http ${res.status}` }, { status: 502 });
  }

  const contentType = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!ALLOWED.test(contentType)) {
    return NextResponse.json({ error: "not_an_image", detail: contentType }, { status: 415 });
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", detail: `${buf.length} bytes` }, { status: 413 });
  }

  let suggestedName = "";
  try {
    const u = new URL(url);
    const tail = u.pathname.split("/").pop() ?? "";
    suggestedName = tail || u.hostname;
  } catch {
    suggestedName = "logo";
  }

  return NextResponse.json({
    ok: true,
    contentBase64: buf.toString("base64"),
    mimeType: contentType,
    suggestedExt: extFromMime(contentType),
    suggestedName,
    bytes: buf.length,
  });
}
