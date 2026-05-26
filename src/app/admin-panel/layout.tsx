import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { AdminTopbar } from "@/components/admin/topbar";

export const metadata: Metadata = {
  title: "Admin Panel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <AdminTopbar user={user} />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {user && (
          <nav className="mb-6 flex flex-wrap gap-1 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <AdminTab href="/admin-panel">Dashboard</AdminTab>
            <AdminTab href="/admin-panel/sites">Sites</AdminTab>
            <AdminTab href="/admin-panel/regions">Regions</AdminTab>
            <AdminTab href="/admin-panel/requests">Inbox</AdminTab>
            <AdminTab href="/admin-panel/tools">Tools</AdminTab>
            <AdminTab href="/admin-panel/audit">Audit log</AdminTab>
          </nav>
        )}
        {children}
      </div>
    </div>
  );
}

function AdminTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]"
    >
      {children}
    </Link>
  );
}
