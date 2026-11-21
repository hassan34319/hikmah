import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/admin";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Door check-in" };

export default async function CheckInIndex() {
  const { supabase, isAdmin, roles } = await requireStaff();
  const from = new Date(Date.now() - 12 * 3600_000).toISOString();
  const { data } = await supabase.from("offerings")
    .select("id, title, subtitle, starts_at, qr_tickets_enabled, offering_types!inner(kind)")
    .eq("offering_types.kind", "event").eq("status", "published").gte("starts_at", from)
    .order("starts_at").limit(20);
  return (
    <AdminShell isAdmin={isAdmin} roles={roles} current="/admin/check-in">
      <AdminHeader title="Door check-in" sub="Pick the event happening now. Works best on a phone." />
      <section className="ad-card">
        <div className="ad-list">
          {(data ?? []).map((e) => (
            <Link key={e.id} href={`/admin/check-in/${e.id}`}>
              <span><strong>{e.title}</strong> {e.qr_tickets_enabled && <span className="ad-tag">QR tickets</span>}<div className="ad-muted">{fmtDate(e.starts_at)}</div></span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
          {(data ?? []).length === 0 && <span className="ad-muted">No upcoming events.</span>}
        </div>
      </section>
    </AdminShell>
  );
}
