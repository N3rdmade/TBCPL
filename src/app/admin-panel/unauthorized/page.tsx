import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Access denied · TBCPL Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>;
}) {
  const { login } = await searchParams;
  const repo = `${env.REPO_OWNER()}/${env.REPO_NAME()}`;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--bg-elev)", color: "var(--danger, #f87171)" }}
      >
        <ShieldAlert size={28} />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">No write access</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          {login ? (
            <>
              <span className="font-mono font-semibold">{login}</span> doesn&apos;t have write
              access to{" "}
              <span className="font-mono">{repo}</span>.
            </>
          ) : (
            <>You don&apos;t have write access to <span className="font-mono">{repo}</span>.</>
          )}
        </p>
        <p className="text-xs text-[var(--fg-muted)]">
          Ask a repo admin to invite you as a collaborator with at least <b>write</b> permission, then sign in again.
        </p>
      </div>
      <div className="flex gap-2">
        <a
          href="/api/auth/github/logout"
          className="inline-flex h-10 items-center rounded-full border px-4 text-sm hover:bg-[var(--bg-card-hover)]"
          style={{ borderColor: "var(--border)" }}
        >
          Sign out
        </a>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          Back to site
        </Link>
      </div>
    </div>
  );
}
