"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export function AdminTopbar({ user }: { user: SessionUser | null }) {
  return (
    <div
      className="sticky top-0 z-30 border-b backdrop-blur-xl"
      style={{
        background: "color-mix(in oklab, var(--bg) 82%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/admin-panel" className="flex items-center gap-2 font-bold">
          <Image src="/logo.png" alt="" width={24} height={24} className="rounded" />
          <span>TBCPL Admin</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            ← View site
          </Link>
          {user ? (
            <>
              <div className="flex items-center gap-2 rounded-full border px-2 py-1" style={{ borderColor: "var(--border)" }}>
                <Image src={user.avatarUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-full" unoptimized />
                <span className="text-sm font-medium">{user.githubLogin}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ background: "var(--bg-elev)", color: "var(--accent)" }}>
                  {user.permission}
                </span>
              </div>
              <a
                href="/api/auth/github/logout"
                className="inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs hover:bg-[var(--bg-card-hover)]"
                style={{ borderColor: "var(--border)" }}
              >
                <LogOut size={12} /> Logout
              </a>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
