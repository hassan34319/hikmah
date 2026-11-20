import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { fmtDate } from "@/lib/time";
import { CheckIn } from "./CheckIn";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Check-in" };

export default async function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStaff();
  const { id } = await params;
  const [{ data: event }, { data: counts }] = await Promise.all([
    supabase.from("offerings").select("id, title, starts_at").eq("id", id).maybeSingle(),
    supabase.rpc("checkin_counts", { p_offering_id: id }),
  ]);
  if (!event) notFound();
  return (
    <div className="ci">
      <div className="ci-top">
        <Link href="/admin/check-in">← All events</Link>
        <h1>{event.title}</h1>
        <span style={{ color: "var(--hk-on-dark-muted)", fontSize: 14 }}>{fmtDate(event.starts_at)}</span>
      </div>
      <CheckIn offeringId={id} initialCounts={counts?.[0] ?? null} />
    </div>
  );
}
