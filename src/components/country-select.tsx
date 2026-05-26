"use client";

import { useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";
import { useRegions } from "./region-context";
import { DEFAULT_REGION_CLIENT } from "@/lib/constants";

export function CountrySelect() {
  const router = useRouter();
  const pathname = usePathname();
  const { regions } = useRegions();

  const current = useMemo(() => {
    const seg = (pathname ?? "/").split("/").filter(Boolean)[0]?.toUpperCase();
    if (!seg) return DEFAULT_REGION_CLIENT;
    const match = regions.find((r) => r.code === seg);
    return match ? match.code : DEFAULT_REGION_CLIENT;
  }, [pathname, regions]);

  return (
    <select
      aria-label="Region"
      value={current}
      onChange={(e) => {
        const code = e.target.value;
        router.push(code === DEFAULT_REGION_CLIENT ? "/" : `/${code.toLowerCase()}`);
      }}
      className="tbcpl-pill h-9 cursor-pointer appearance-none bg-transparent pl-3 pr-8 text-sm font-semibold outline-none"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23a1a1aa' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
      }}
    >
      {regions.map((r) => (
        <option key={r.code} value={r.code} style={{ background: "var(--bg-elev)", color: "var(--fg)" }}>
          {r.flag} {r.name}
        </option>
      ))}
    </select>
  );
}
