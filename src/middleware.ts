import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.headers.set("CDN-Cache-Control", "no-store");
    res.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    res.headers.set("Vercel-CDN-Cache-Control", "no-store");
    res.headers.set("Pragma", "no-cache");
  }
  return res;
}

export const config = {
  matcher: ["/api/admin/:path*"],
};


//no cache for cf