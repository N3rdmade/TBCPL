/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
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
  async headers() {
    return [
      {
        source: "/:path(sitemap.xml|robots.txt)",
        headers: [
          { key: "Vary", value: "Accept-Encoding" },
          { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
