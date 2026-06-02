import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRegionByCode, getLinksForRegion, DEFAULT_REGION_CODE } from "@/lib/data";
import { CATEGORY_META } from "@/lib/constants";
import { RegionPage } from "@/components/region-page";

export const dynamic = "force-static";
export const revalidate = 3600;

const RESERVED = new Set(["about", "dmca", "request"]);

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params;
  if (CATEGORY_META[slug]) {
    const m = CATEGORY_META[slug];
    return { title: `${m.label} — USA`, description: m.blurb };
  }
  const r = await getRegionByCode(slug);
  if (r) return { title: `${r.flag} ${r.name}`, description: `Streaming sites curated for ${r.name}.` };
  return {};
}

export default async function SlugRoute({ params }: { params: { slug: string } }) {
  const { slug } = params;
  if (RESERVED.has(slug)) notFound();

  // Category under default region
  if (CATEGORY_META[slug]) {
    const region = await getRegionByCode(DEFAULT_REGION_CODE);
    if (!region) notFound();
    const data = await getLinksForRegion(region.code);
    if (!data.categories.find((c) => c.id === slug)) notFound();
    return <RegionPage region={region} onlyCategoryId={slug} />;
  }

  // Region
  const region = await getRegionByCode(slug);
  if (!region) notFound();
  return <RegionPage region={region} />;
}
