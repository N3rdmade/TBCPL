import { getLinksForRegion, getRegions } from "@/lib/data";
import type { Region } from "@/lib/types";
import { Sidebar } from "./sidebar";
import { Hero } from "./hero";
import { RecentlyVisited } from "./recently-visited";
import { CategorySection } from "./category-section";
import { FavoritesSection } from "./favorites-section";
import { MobileCategoryBar } from "./mobile-category-bar";
import { CountrySelect } from "./country-select";

interface Props {
  region: Region;
  onlyCategoryId?: string;
}

export async function RegionPage({ region, onlyCategoryId }: Props) {
  const data = await getLinksForRegion(region.code);
  const cats = data.categories.map((c) => ({ id: c.id, name: c.name, count: c.sites.length }));
  const visible = onlyCategoryId
    ? data.categories.filter((c) => c.id === onlyCategoryId)
    : data.categories;

  const totalSites = data.categories.reduce((acc, c) => acc + c.sites.length, 0);
  const allRegions = await getRegions();
  const stats = [
    { label: "Sites", value: totalSites },
    { label: "Categories", value: data.categories.length },
    { label: "Regions", value: allRegions.length },
  ];

  // ItemList JSON-LD — tells Google this page aggregates these named sites.
  // Flattened across visible categories so "<site name>" queries have an
  // entity on this URL to match against.
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: onlyCategoryId
      ? `${onlyCategoryId} streaming sites — ${region.name}`
      : `Free streaming sites — ${region.name}`,
    numberOfItems: visible.reduce((n, c) => n + c.sites.length, 0),
    itemListElement: visible.flatMap((cat) =>
      cat.sites.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.name,
        url: s.url,
        ...(s.description ? { description: s.description } : {}),
      })),
    ),
  };

  return (
    <main className="mx-auto max-w-[1600px] px-3 pb-16 pt-4 sm:px-4 md:px-6 md:pt-6 2xl:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <Hero regionCode={region.code} regionFlag={region.flag} regionName={region.name} stats={stats} />
      <div className="mb-4 flex justify-center md:hidden">
        <CountrySelect />
      </div>
      <div className="flex gap-8">
        <Sidebar regionCode={region.code} categories={cats} />
        <div className="min-w-0 flex-1">
          <RecentlyVisited />
          {!onlyCategoryId && <FavoritesSection />}
          {!onlyCategoryId && <MobileCategoryBar categories={cats} />}
          <div className="space-y-10 md:space-y-12">
            {visible.map((cat) => (
              <CategorySection key={cat.id} category={cat} />
            ))}
          </div>

          {/* Crawler-visible site list. Visually hidden but readable to Google,
              so queries like a site's name match this page as an aggregator. */}
          <section className="sr-only">
            <h2>Streaming sites listed on TBCPL — {region.name}</h2>
            {visible.map((cat) => (
              <div key={`seo-${cat.id}`}>
                <h3>{cat.name}</h3>
                <ul>
                  {cat.sites.map((s) => {
                    let host = s.url;
                    try { host = new URL(s.url).hostname.replace(/^www\./, ""); } catch {}
                    return (
                      <li key={`seo-${cat.id}-${s.name}-${s.url}`}>
                        <strong>{s.name}</strong> ({host})
                        {s.description ? ` — ${s.description}` : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
