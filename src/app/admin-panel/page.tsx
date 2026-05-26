import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe2, LayoutGrid, Inbox, ScrollText, ExternalLink, Wrench } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getRegions, getLinksForRegion } from "@/lib/data";
import { db, COLLECTIONS } from "@/lib/db";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Dashboard · TBCPL Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getStats() {
  const regions = await getRegions();
  const usa = await getLinksForRegion("USA");
  const siteCount = usa.categories.reduce((sum, c) => sum + c.sites.length, 0);

  let pendingRequests = 0;
  try {
    const d = await db();
    pendingRequests = await d
      .collection(COLLECTIONS.siteRequests)
      .countDocuments({ status: { $in: [null, "pending"] } });
  } catch {
    // Mongo unreachable — leave as 0
  }

  return {
    regions: regions.length,
    categories: usa.categories.length,
    sites: siteCount,
    pendingRequests,
  };
}

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin-panel/login");

  const stats = await getStats();
  const repo = `${env.REPO_OWNER()}/${env.REPO_NAME()}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.githubLogin}</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Editing{" "}
          <a
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[var(--accent)] hover:underline"
          >
            {repo}
            <ExternalLink size={11} className="ml-0.5 inline-block" />
          </a>{" "}
          on branch <span className="font-mono">{env.REPO_BRANCH()}</span>. All changes commit
          directly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Regions" value={stats.regions} />
        <StatCard label="Categories" value={stats.categories} />
        <StatCard label="Sites (USA)" value={stats.sites} />
        <StatCard label="Pending requests" value={stats.pendingRequests} highlight={stats.pendingRequests > 0} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ActionCard
          href="/admin-panel/sites"
          icon={<LayoutGrid size={18} />}
          title="Edit sites"
          body="Reorder categories, add or remove sites, upload logos. Saves commit directly to GitHub."
        />
        <ActionCard
          href="/admin-panel/regions"
          icon={<Globe2 size={18} />}
          title="Manage regions"
          body="Toggle countries on/off, edit region metadata, set the default landing region."
        />
        <ActionCard
          href="/admin-panel/requests"
          icon={<Inbox size={18} />}
          title="Site requests"
          body={
            stats.pendingRequests > 0
              ? `${stats.pendingRequests} pending — review and approve from the inbox.`
              : "No pending requests. Submissions from the public form land here."
          }
          badge={stats.pendingRequests > 0 ? String(stats.pendingRequests) : undefined}
        />
        <ActionCard
          href="/admin-panel/tools"
          icon={<Wrench size={18} />}
          title="Power tools"
          body="Scan for orphan logos, replace domains across all regions, run a health check, fill empty categories."
        />
        <ActionCard
          href="/admin-panel/audit"
          icon={<ScrollText size={18} />}
          title="Audit log"
          body="Every publish, every approver, every commit SHA. Tied to your GitHub identity."
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: highlight ? "var(--accent)" : "var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-[var(--fg-muted)]">{label}</div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  body,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border p-4 transition hover:bg-[var(--bg-card-hover)]"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--bg-elev)", color: "var(--accent)" }}
        >
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
        {badge && (
          <span
            className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">{body}</p>
    </Link>
  );
}
