import type { MetadataRoute } from "next";
import { getLinksForRegion, getRegions } from "@/lib/data";

const BASE = "https://tbcpl.lol";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/request`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/dmca`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const regions = await getRegions();
  for (const r of regions) {
    const code = r.code.toLowerCase();
    entries.push({
      url: `${BASE}/${code}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: r.code === "USA" ? 0.95 : 0.8,
    });
    const data = await getLinksForRegion(r.code);
    for (const c of data.categories) {
      entries.push({
        url: `${BASE}/${code}/${c.id}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }

  return entries;
}
