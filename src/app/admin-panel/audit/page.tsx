import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AuditLog } from "@/components/admin/audit-log";

export const metadata: Metadata = {
  title: "Audit log · TBCPL Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin-panel/login");
  return <AuditLog />;
}
