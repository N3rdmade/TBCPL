import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAllRegions } from "@/lib/data";
import { ToolsPanel } from "@/components/admin/tools-panel";

export const metadata: Metadata = {
  title: "Tools · TBCPL Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin-panel/login");
  const regions = await getAllRegions();
  return <ToolsPanel regions={regions} />;
}
