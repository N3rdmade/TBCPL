import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin Login · TBCPL",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "GitHub didn't return an authorization code. Try again.",
  bad_state: "Login state mismatch. Please try again from this page.",
  callback_failed: "Something went wrong talking to GitHub. Try again.",
  access_denied: "You cancelled the GitHub authorization.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getSessionUser();
  if (user) redirect("/admin-panel");

  const { error } = searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? `Login error: ${error}`) : null;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 text-center">
      <Image src="/logo.png" alt="" width={64} height={64} className="rounded-xl" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Admin sign-in</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          You need write access to the TBCPL repository to manage this panel.
        </p>
      </div>
      {message && (
        <div
          className="w-full rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-elev)", color: "var(--danger, #f87171)" }}
        >
          {message}
        </div>
      )}
      <a
        href="/api/auth/github/login"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .3.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
        </svg>
        Continue with GitHub
      </a>
      <Link href="/" className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]">
        ← Back to site
      </Link>
    </div>
  );
}
