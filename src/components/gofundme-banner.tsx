"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const KEY = "tbcpl-gfm-dismissed-v1";

export function GoFundMeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;
  return (
    <div
      className="relative flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-10 py-2 text-center text-xs font-medium text-white sm:text-sm"
      style={{ background: "linear-gradient(135deg, #ff6b6b, #ee5a24)" }}
    >
      <span>Going through a rough patch — any help means the world.</span>
      <a
        href="https://gofund.me/51439b443"
        target="_blank"
        rel="noreferrer"
        className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-[#ee5a24] sm:text-xs"
      >
        Support 💜
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setShow(false);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}
