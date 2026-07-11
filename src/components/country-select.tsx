"use client";

import { useRouter, usePathname } from "next/navigation";
import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useRegions } from "./region-context";
import { DEFAULT_REGION_CLIENT } from "@/lib/constants";
import { FlagIcon } from "./flag-icon";

export function CountrySelect() {
  const router = useRouter();
  const pathname = usePathname();
  const { regions } = useRegions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = useMemo(() => {
    const seg = (pathname ?? "/").split("/").filter(Boolean)[0]?.toUpperCase();
    if (!seg) return DEFAULT_REGION_CLIENT;
    const match = regions.find((r) => r.code === seg);
    return match ? match.code : DEFAULT_REGION_CLIENT;
  }, [pathname, regions]);

  const currentRegion = regions.find((r) => r.code === current);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open]);

  const handleSelect = (code: string) => {
    setOpen(false);
    router.push(code === DEFAULT_REGION_CLIENT ? "/" : `/${code.toLowerCase()}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Select region"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="tbcpl-pill flex h-9 cursor-pointer items-center gap-2 pl-3 pr-2 text-sm font-semibold"
      >
        {currentRegion && <FlagIcon code={currentRegion.flag} size={16} />}
        <span className="hidden xs:inline">{currentRegion?.name ?? "Region"}</span>
        <ChevronDown
          size={14}
          className={`text-[var(--fg-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 max-h-72 w-48 overflow-y-auto rounded-xl border py-1 shadow-lg"
          style={{
            background: "var(--bg-elev)",
            borderColor: "var(--border-strong)",
            boxShadow: "var(--shadow)",
          }}
        >
          {regions.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => handleSelect(r.code)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-card-hover)] ${
                r.code === current ? "bg-[var(--bg-card-hover)] text-[var(--fg)]" : "text-[var(--fg-muted)]"
              }`}
            >
              <FlagIcon code={r.flag} size={18} />
              <span>{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
