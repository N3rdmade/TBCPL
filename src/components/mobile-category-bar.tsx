"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, X } from "lucide-react";
import { CATEGORY_META } from "@/lib/constants";

interface Props {
  categories: { id: string; name: string; count: number }[];
}

export function MobileCategoryBar({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {show && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Jump to category"
          className="fixed bottom-5 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full px-4 shadow-lg lg:hidden"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            boxShadow: "0 8px 28px var(--accent-glow)",
          }}
        >
          <LayoutGrid size={16} />
          <span className="text-sm font-semibold">Jump</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.55)" }} />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t p-5 pb-safe"
            style={{ background: "var(--bg-elev)", borderColor: "var(--border-strong)" }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full" style={{ background: "var(--border-strong)" }} />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Jump to category</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => {
                const meta = CATEGORY_META[c.id];
                return (
                  <a
                    key={c.id}
                    href={`#cat-${c.id}`}
                    onClick={() => setOpen(false)}
                    className="tbcpl-card flex items-center justify-between gap-2 px-3 py-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{meta?.icon}</span>
                      <span>{meta?.label ?? c.name}</span>
                    </span>
                    <span className="rounded px-1.5 text-[10px] font-mono" style={{ background: "var(--bg)", color: "var(--fg-muted)" }}>
                      {c.count}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
