import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { RequestsInbox } from "@/components/admin/requests-inbox";

export const metadata: Metadata = {
  title: "Site requests · TBCPL Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin-panel/login");
  return <RequestsInbox />;
}
