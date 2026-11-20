import type { Metadata } from "next";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { getSiteSettings } from "@/lib/settings";
import { HomepageEditor } from "./HomepageEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Homepage" };

export default async function HomepageManager() {
  await requireAdmin();
  const settings = await getSiteSettings();
  return (
    <AdminShell isAdmin current="/admin/homepage">
      <AdminHeader title="Homepage" sub="Edit the homepage, footer contact details and the partner list. Changes go live when you save." />
      <HomepageEditor initial={settings} />
    </AdminShell>
  );
}
