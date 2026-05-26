import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRegions, getRegionByCode, getLinksForRegion } from "@/lib/data";
import { CATEGORY_META } from "@/lib/constants";
import { RegionPage } from "@/components/region-page";

export const dynamicParams = false;

export async function generateStaticParams() {
  const regions = await getRegions();
  const cats = Object.keys(CATEGORY_META);
  const params: { slug: string; category: string }[] = [];
  for (const r of regions) {
    if (r.code === "USA") continue;
    for (const c of cats) {
      params.push({ slug: r.code.toLowerCase(), category: c });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; category: string }>;
}): Promise<Metadata> {
  const { slug, category } = await params;
  const r = await getRegionByCode(slug);
  const meta = CATEGORY_META[category];
  if (!r || !meta) return {};
  return { title: `${meta.label} — ${r.flag} ${r.name}`, description: meta.blurb };
}

export default async function RegionCategoryRoute({
  params,
}: {
  params: Promise<{ slug: string; category: string }>;
}) {
  const { slug, category } = await params;
  const region = await getRegionByCode(slug);
  if (!region) notFound();
  if (!CATEGORY_META[category]) notFound();
  const data = await getLinksForRegion(region.code);
  if (!data.categories.find((c) => c.id === category)) notFound();
  return <RegionPage region={region} onlyCategoryId={category} />;
}
