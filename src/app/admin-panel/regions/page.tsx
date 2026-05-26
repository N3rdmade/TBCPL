import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAllRegions } from "@/lib/data";
import { RegionsEditor } from "@/components/admin/regions-editor";

export const metadata: Metadata = {
  title: "Regions · TBCPL Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminRegionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin-panel/login");
  const regions = await getAllRegions();
  return <RegionsEditor initial={regions} />;
}
