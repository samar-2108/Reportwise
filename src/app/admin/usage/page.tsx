import { notFound } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth/require-admin";
import AdminUsageClient from "./admin-usage-client";

export const instant = false;

export default async function AdminUsagePage() {
  const { isAdmin } = await checkIsAdmin();

  // If unauthenticated or user is not in ADMIN_EMAILS, return 404 to avoid route advertising
  if (!isAdmin) {
    notFound();
  }

  return <AdminUsageClient />;
}
