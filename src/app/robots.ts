import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin-panel", "/admin-panel/", "/api/"],
      },
    ],
    sitemap: "https://tbcpl.lol/sitemap.xml",
    host: "https://tbcpl.lol",
  };
}
