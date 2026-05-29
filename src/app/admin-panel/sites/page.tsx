import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getRegions } from "@/lib/data";
import { SitesEditor } from "@/components/admin/sites-editor";

export const metadata: Metadata = {
  title: "Sites · TBCPL Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSitesPage({
  searchParams,
}: {
  searchParams: { region?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/admin-panel/login");

  const { region } = searchParams;
  const regions = await getRegions();
  const initialRegion = (region ?? "USA").toUpperCase();
  const valid = regions.some((r) => r.code === initialRegion) ? initialRegion : "USA";

  return <SitesEditor regions={regions} initialRegion={valid} />;
}
