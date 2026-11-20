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
    const defaultRegion = await getRegionByCode(DEFAULT_REGION_CODE);
    const regionName = defaultRegion?.name ?? "USA";
    const title = `${m.label} — ${regionName}`;
    return {
      title,
      description: m.blurb,
      alternates: { canonical: `/${slug}` },
      openGraph: { title, description: m.blurb, url: `/${slug}`, type: "website" },
      twitter: { title, description: m.blurb, card: "summary_large_image" },
    };
  }
  const r = await getRegionByCode(slug);
  if (r) {
    const title = `${r.name} — Free streaming sites`;
    const description = `Curated free streaming sites for ${r.name}: movies, TV, anime, manga, live TV and sports.`;
    return {
      title,
      description,
      alternates: { canonical: `/${slug}` },
      openGraph: { title, description, url: `/${slug}`, type: "website" },
      twitter: { title, description, card: "summary_large_image" },
    };
  }
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
