import type { MetadataRoute } from "next";

// AI training crawlers we block. Keep in sync with Cloudflare's managed list
// if you later disable CF's injection — this is the authoritative copy.
const AI_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "Google-Extended",
  "CCBot",
  "Amazonbot",
  "Applebot-Extended",
  "Bytespider",
  "PerplexityBot",
  "cohere-ai",
  "MistralAI-Training",
  "meta-externalagent",
  "Diffbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin-panel", "/admin-panel/", "/api/"],
      },
      ...AI_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: "https://tbcpl.lol/sitemap.xml",
    host: "https://tbcpl.lol",
  };
}
