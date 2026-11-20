import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, ButtonLink, PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { formatEventDate } from "@/lib/offerings";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My account" };

const STATUS_LABEL: Record<string, string> = {
  submitted: "Applied", confirmed: "Confirmed", waitlisted: "Waitlisted", cancelled: "Cancelled", attended: "Attended", no_show: "Missed",
};

export default async function AccountPage() {
  if (!supabaseConfigured) redirect("/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");

  const [{ data: profile }, { data: regs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("registrations")
      .select("id, status, submitted_at, offerings(slug, title, starts_at, offering_types(kind))")
      .eq("user_id", user.id).order("submitted_at", { ascending: false }),
  ]);
  type Reg = { id: string; status: string; submitted_at: string; offerings: { slug: string; title: string; starts_at: string | null; offering_types: { kind: string } | null } | null };
  const registrations = (regs ?? []) as unknown as Reg[];

  return (
    <SiteShell>
      <PageBand eyebrow="My account" title={`Assalamu alaikum${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} />
      <section className="hk-section"><div className="hk-container" style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "start" }}>
        <div className="hk-panel" style={{ display: "grid", gap: 14 }}>
          <h2 style={{ fontSize: 20 }}>My registrations</h2>
          {registrations.length === 0 && <p style={{ margin: 0, color: "var(--hk-muted)" }}>Nothing yet. <Link href="/events">Browse upcoming events</Link>.</p>}
          {registrations.map((r) => r.offerings && (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--hk-border)", paddingTop: 12 }}>
              <div>
                <Link href={`/account/registrations/${r.id}`} style={{ fontWeight: 600 }}>{r.offerings.title}</Link>
                <div style={{ fontSize: 14, color: "var(--hk-muted)" }}>{formatEventDate(r.offerings.starts_at) ?? "Course application"}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{STATUS_LABEL[r.status] ?? r.status}</span>
            </div>
          ))}
        </div>
        <div className="hk-panel" style={{ display: "grid", gap: 8 }}>
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>My details</h2>
          <div>{profile?.full_name}</div>
          <div style={{ color: "var(--hk-muted)" }}>{profile?.email}</div>
          <div style={{ color: "var(--hk-muted)" }}>{profile?.phone && `WhatsApp ${profile.phone}`}</div>
          <div style={{ color: "var(--hk-muted)" }}>{profile?.area ? `${profile.area}, Karachi` : null}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <ButtonLink href="/complete-profile" variant="ghost" size="sm">Edit details</ButtonLink>
            <form action="/auth/sign-out" method="post"><Button type="submit" variant="ghost" size="sm">Sign out</Button></form>
          </div>
        </div>
      </div></section>
    </SiteShell>
  );
}
