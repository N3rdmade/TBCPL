/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about.html", destination: "/about", permanent: true },
      { source: "/dmca.html", destination: "/dmca", permanent: true },
      { source: "/site-request.html", destination: "/request", permanent: true },
    ];
  },
  // Rewrite public cache-control so CF caches our HTML. The webhook purges
  // CF on every admin push, so an hour of edge caching is safe.
  // Admin/API routes stay untouched — their own routes set private/no-store.
  async headers() {
    return [
      {
        source: "/((?!api|admin-panel|_next).*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
