"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, X, Search } from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import { CountrySelect } from "./country-select";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./command-palette";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/request", label: "Request" },
  { href: "/dmca", label: "DMCA" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { open: openPalette } = useCommandPalette();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <nav
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl transition-all",
        scrolled && "shadow-[0_4px_24px_rgba(0,0,0,0.25)]",
      )}
      style={{
        background: "color-mix(in oklab, var(--bg) 82%, transparent)",
        borderColor: scrolled ? "var(--border-strong)" : "var(--border)",
      }}
    >
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 md:px-6 md:py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
          <Image src="/logo.png" alt="TBCPL" width={28} height={28} className="h-7 w-7 rounded" />
          <span className="hidden text-base sm:inline">TBCPL</span>
        </Link>

        <ul className="ml-2 hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--bg-card-hover)] text-[var(--fg)]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
                  )}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Desktop pill search */}
          <button
            type="button"
            onClick={openPalette}
            aria-label="Search"
            className="tbcpl-pill hidden h-9 items-center gap-2 px-3 text-sm lg:inline-flex"
          >
            <Search size={14} />
            <span className="text-[var(--fg-muted)]">Search sites…</span>
            <kbd
              className="ml-2 rounded border px-1.5 py-0.5 text-[10px] font-mono"
              style={{ borderColor: "var(--border)" }}
            >
              ⌘K
            </kbd>
          </button>
          {/* Compact search icon (small + medium screens) */}
          <button
            type="button"
            onClick={openPalette}
            aria-label="Search"
            className="tbcpl-pill inline-flex h-9 w-9 items-center justify-center lg:hidden"
          >
            <Search size={16} />
          </button>

          {/* Country select: hidden on phones, shown sm+ */}
          <div className="hidden sm:block">
            <CountrySelect />
          </div>

          <ThemeSwitcher />

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            className="tbcpl-pill inline-flex h-9 w-9 items-center justify-center md:hidden"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="border-t md:hidden"
          style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
        >
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3">
            <div className="sm:hidden">
              <CountrySelect />
            </div>
            <ul className="flex flex-col gap-1">
              {NAV.map((n) => {
                const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      className={cn(
                        "block rounded-lg px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-[var(--bg-card-hover)] text-[var(--fg)]"
                          : "text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]",
                      )}
                    >
                      {n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}
