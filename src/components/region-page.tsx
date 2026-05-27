import { getLinksForRegion, getRegions } from "@/lib/data";
import type { Region } from "@/lib/types";
import { Sidebar } from "./sidebar";
import { FilterChips } from "./filter-chips";
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

  return (
    <main className="mx-auto max-w-[1600px] px-3 pb-16 pt-4 sm:px-4 md:px-6 md:pt-6 2xl:px-8">
      <Hero regionFlag={region.flag} regionName={region.name} stats={stats} />
      <div className="mb-4 flex justify-center md:hidden">
        <CountrySelect />
      </div>
      <div className="flex gap-8">
        <Sidebar regionCode={region.code} categories={cats} />
        <div className="min-w-0 flex-1">
          <RecentlyVisited />
          {!onlyCategoryId && <FavoritesSection />}
          {!onlyCategoryId && <FilterChips categories={cats} />}
          {!onlyCategoryId && <MobileCategoryBar categories={cats} />}
          <div className="space-y-10 md:space-y-12">
            {visible.map((cat) => (
              <CategorySection key={cat.id} category={cat} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
