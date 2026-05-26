"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Shield, X } from "lucide-react";

const KEY = "tbcpl-safety-dismissed-v1";

export function SafetyToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) {
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-40 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border p-4 shadow-lg backdrop-blur-xl"
      style={{
        background: "color-mix(in oklab, var(--bg-elev) 92%, transparent)",
        borderColor: "var(--border-strong)",
        boxShadow: "var(--shadow)",
      }}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded p-1 text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]"
      >
        <X size={14} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Shield className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
        <div className="text-sm">
          <div className="font-semibold">Before clicking any link</div>
          <p className="mt-1 text-[var(--fg-muted)]">
            Use{" "}
            <a className="inline-flex items-center gap-1 text-[var(--fg)] underline" href="https://brave.com/" target="_blank" rel="noreferrer">
              <Image src="/assets/brave.png" alt="" width={14} height={14} /> Brave
            </a>{" "}
            or{" "}
            <a className="inline-flex items-center gap-1 text-[var(--fg)] underline" href="https://ublockorigin.com/" target="_blank" rel="noreferrer">
              <Image src="/assets/ublock.png" alt="" width={14} height={14} /> uBlock Origin
            </a>{" "}
            to stop unwanted popups and ads.
          </p>
        </div>
      </div>
    </div>
  );
}
