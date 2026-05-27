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

          {/* Country select: hidden on phones (lives below the hero on mobile), shown md+ in navbar */}
          <div className="hidden md:block">
            <CountrySelect />
          </div>

          {/* Discord + Reddit (mobile only — desktop has the sidebar banners) */}
          <a
            href="https://discord.gg/BPxzYVY5UU"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Discord"
            className="tbcpl-pill inline-flex h-9 w-9 items-center justify-center md:hidden"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
              <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.07 14.07 0 0 0-.617 1.272 18.27 18.27 0 0 0-5.487 0A12.6 12.6 0 0 0 9.83 3 19.74 19.74 0 0 0 6.07 4.371C2.5 9.578 1.5 14.64 1.999 19.633A19.93 19.93 0 0 0 7.97 22.49c.48-.655.908-1.35 1.275-2.084-.7-.262-1.37-.586-2.003-.966.168-.122.333-.25.491-.382 3.872 1.787 8.06 1.787 11.886 0 .16.131.324.26.491.382-.634.382-1.305.706-2.005.967.367.733.795 1.427 1.275 2.084a19.9 19.9 0 0 0 5.972-2.857c.585-5.79-.99-10.806-4.034-15.265ZM8.673 16.61c-1.182 0-2.156-1.083-2.156-2.414 0-1.33.952-2.414 2.156-2.414 1.213 0 2.176 1.094 2.156 2.414 0 1.331-.952 2.414-2.156 2.414Zm6.66 0c-1.182 0-2.156-1.083-2.156-2.414 0-1.33.952-2.414 2.156-2.414 1.213 0 2.176 1.094 2.156 2.414 0 1.331-.943 2.414-2.156 2.414Z" />
            </svg>
          </a>
          <a
            href="https://www.reddit.com/r/tbcpl/"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Reddit"
            className="tbcpl-pill inline-flex h-9 w-9 items-center justify-center md:hidden"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
              <path d="M22 12.07a2.07 2.07 0 0 0-3.5-1.5 10.27 10.27 0 0 0-5.59-1.76l.95-4.5 3.13.66a1.5 1.5 0 1 0 .15-.96l-3.5-.74a.5.5 0 0 0-.59.38l-1.06 5.02A10.27 10.27 0 0 0 5.5 10.57a2.07 2.07 0 1 0-2.36 3.34A4.13 4.13 0 0 0 3 14.86C3 18.25 7.03 21 12 21s9-2.75 9-6.14a4.13 4.13 0 0 0-.14-1.05A2.07 2.07 0 0 0 22 12.07ZM7.5 14a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm8.36 4.18A6.18 6.18 0 0 1 12 19.36a6.18 6.18 0 0 1-3.86-1.18.5.5 0 0 1 .6-.8A5.18 5.18 0 0 0 12 18.36a5.18 5.18 0 0 0 3.26-.98.5.5 0 1 1 .6.8Zm-.36-2.68a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
            </svg>
          </a>

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
