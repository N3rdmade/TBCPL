export function linksPathForRegion(regionCode: string): string {
  const upper = regionCode.toUpperCase();
  if (upper === "USA") return "public/links.json";
  return `public/Region-Links/links.${upper}.json`;
}

export function regionsJsonPath(): string {
  return "public/regions.json";
}

export function logoPathForCategory(categoryId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `public/logo/${categoryId}/${safe}`;
}

const EXT_RE = /\.(png|jpe?g|svg|gif|webp|ico|avif)$/i;

function slug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hostnameSlug(url: string): string {
  try {
    const u = new URL(url);
    const head = u.hostname.replace(/^www\./, "").split(".")[0];
    return slug(head);
  } catch {
    return "";
  }
}

function extFor(originalName: string, mimeType?: string): string {
  const m = originalName.match(EXT_RE);
  if (m) return m[0].toLowerCase();
  const mt = (mimeType ?? "").toLowerCase();
  if (mt.includes("png")) return ".png";
  if (mt.includes("jpeg") || mt.includes("jpg")) return ".jpg";
  if (mt.includes("svg")) return ".svg";
  if (mt.includes("gif")) return ".gif";
  if (mt.includes("webp")) return ".webp";
  if (mt.includes("avif")) return ".avif";
  if (mt.includes("ico")) return ".ico";
  return ".png";
}

export function deriveLogoFilename(input: {
  originalName: string;
  mimeType?: string;
  siteName?: string;
  siteUrl?: string;
}): string {
  const ext = extFor(input.originalName, input.mimeType);
  const fromName = slug(input.siteName ?? "");
  if (fromName) return fromName + ext;
  const fromHost = hostnameSlug(input.siteUrl ?? "");
  if (fromHost) return fromHost + ext;
  const orig = input.originalName.replace(EXT_RE, "");
  return (slug(orig) || "logo") + ext;
}
