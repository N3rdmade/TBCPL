import "server-only";
import { getRepoFile } from "@/lib/github/repo";
import { linksPathForRegion, regionsJsonPath } from "@/lib/admin/paths";
import type { LinksData, RegionsData } from "@/lib/types";

export interface RegionFile {
  region: string;
  path: string;
  data: LinksData;
  raw: string;
}

export async function loadAllRegionFiles(token: string): Promise<{
  files: RegionFile[];
  errors: { region: string; reason: string }[];
}> {
  const regionsRaw = await getRepoFile({ token, path: regionsJsonPath() });
  if (!regionsRaw) return { files: [], errors: [{ region: "(regions.json)", reason: "not_found" }] };
  let regions: RegionsData;
  try {
    regions = JSON.parse(regionsRaw) as RegionsData;
  } catch {
    return { files: [], errors: [{ region: "(regions.json)", reason: "invalid_json" }] };
  }
  const files: RegionFile[] = [];
  const errors: { region: string; reason: string }[] = [];
  for (const r of regions.regions) {
    const code = r.code.toUpperCase();
    const path = linksPathForRegion(code);
    const raw = await getRepoFile({ token, path });
    if (!raw) {
      errors.push({ region: code, reason: "file_missing" });
      continue;
    }
    try {
      const data = JSON.parse(raw) as LinksData;
      if (!Array.isArray(data.categories)) {
        errors.push({ region: code, reason: "malformed" });
        continue;
      }
      files.push({ region: code, path, data, raw });
    } catch {
      errors.push({ region: code, reason: "invalid_json" });
    }
  }
  return { files, errors };
}

export function normalizeUrl(url: string): { full: string; host: string } {
  const trimmed = url.trim().toLowerCase();
  try {
    const u = new URL(trimmed);
    return { full: trimmed, host: u.hostname.replace(/^www\./, "") };
  } catch {
    return { full: trimmed, host: trimmed };
  }
}
