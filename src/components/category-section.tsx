import { CATEGORY_META } from "@/lib/constants";
import type { Category } from "@/lib/types";
import { SiteCard } from "./site-card";
import { CategoryIcon } from "./category-icon";

export function CategorySection({ category }: { category: Category }) {
  const meta = CATEGORY_META[category.id];
  return (
    <section id={`cat-${category.id}`} data-category={category.id} className="scroll-mt-32">
      <div className="mb-3 flex items-baseline justify-between md:mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl md:text-2xl">
          <CategoryIcon id={category.id} size={22} />
          {meta?.label ?? category.name}
          <span
            className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold md:text-xs"
            style={{ background: "var(--bg-elev)", color: "var(--fg-muted)" }}
          >
            {category.sites.length}
          </span>
        </h2>
        {meta?.blurb && <p className="hidden text-sm text-[var(--fg-muted)] md:block">{meta.blurb}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {category.sites.map((site) => (
          <SiteCard key={`${site.name}-${site.url}`} site={site} categoryId={category.id} />
        ))}
      </div>
    </section>
  );
}
