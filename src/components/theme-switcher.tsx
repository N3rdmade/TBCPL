"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Palette, Check } from "lucide-react";
import { THEMES } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = mounted ? theme ?? "purple-dark" : "purple-dark";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Switch theme"
        onClick={() => setOpen((o) => !o)}
        className="tbcpl-pill inline-flex h-9 items-center gap-2 px-3 text-sm"
      >
        <Palette size={16} />
        <span className="hidden sm:inline">Theme</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border p-1 shadow-lg"
          style={{
            background: "var(--bg-elev)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow)",
          }}
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                "hover:bg-[var(--bg-card-hover)]",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full ring-1 ring-white/10"
                  style={{ background: t.swatch }}
                />
                {t.label}
              </span>
              {current === t.id && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
