import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  LinksData,
  Region,
  RegionsData,
  Site,
  SiteSearchEntry,
} from "./types";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const DEFAULT_REGION = "USA";

async function readJSON<T>(rel: string): Promise<T> {
  const full = path.join(PUBLIC_DIR, rel);
  const raw = await fs.readFile(full, "utf8");
  return JSON.parse(raw) as T;
}

export async function getRegions(): Promise<Region[]> {
  const data = await readJSON<RegionsData>("regions.json");
  return data.regions.filter((r) => r.enabled !== false);
}

export async function getAllRegions(): Promise<Region[]> {
  const data = await readJSON<RegionsData>("regions.json");
  return data.regions;
}

export async function getRegionByCode(code: string): Promise<Region | null> {
  const regions = await getRegions();
  const upper = code.toUpperCase();
  return regions.find((r) => r.code === upper) ?? null;
}

async function loadLinksFile(regionCode: string): Promise<LinksData> {
  const upper = regionCode.toUpperCase();
  if (upper === DEFAULT_REGION) {
    return readJSON<LinksData>("links.json");
  }
  try {
    return await readJSON<LinksData>(`Region-Links/links.${upper}.json`);
  } catch {
    return readJSON<LinksData>("links.json");
  }
}

export async function getLinksForRegion(
  regionCode: string,
): Promise<LinksData> {
  const data = await loadLinksFile(regionCode);
  return {
    categories: data.categories.map((c) => ({
      ...c,
      sites: c.sites.filter((s) => s.enabled !== false),
    })),
  };
}

// Unfiltered — for the admin editor so disabled sites are still visible/editable.
export async function getAllLinksForRegion(
  regionCode: string,
): Promise<LinksData> {
  return loadLinksFile(regionCode);
}

export async function getCategory(
  regionCode: string,
  categoryId: string,
): Promise<{ region: Region; category: LinksData["categories"][number] } | null> {
  const region = await getRegionByCode(regionCode);
  if (!region) return null;
  const links = await getLinksForRegion(regionCode);
  const category = links.categories.find((c) => c.id === categoryId);
  if (!category) return null;
  return { region, category };
}

export async function buildSearchIndex(
  regionCode: string,
): Promise<SiteSearchEntry[]> {
  const links = await getLinksForRegion(regionCode);
  const out: SiteSearchEntry[] = [];
  for (const cat of links.categories) {
    for (const site of cat.sites) {
      out.push({
        ...site,
        categoryId: cat.id,
        categoryName: cat.name,
        regionCode: regionCode.toUpperCase(),
      });
    }
  }
  return out;
}

export function siteKey(site: Site): string {
  try {
    const u = new URL(site.url);
    return `${site.name.toLowerCase()}@${u.hostname}`;
  } catch {
    return `${site.name.toLowerCase()}@${site.url}`;
  }
}

export const DEFAULT_REGION_CODE = DEFAULT_REGION;
