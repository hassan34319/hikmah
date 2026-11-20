import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProfileRow, RegistrationStatus } from "@hikmah/db";
import { AdminHeader, AdminShell, StatusPill } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { ageFrom } from "@/lib/people";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Person" };

type Reg = { id: string; status: RegistrationStatus; submitted_at: string; checked_in_at: string | null; ticket_code: string | null; offerings: { id: string; title: string; starts_at: string | null; offering_types: { name: string; kind: string } | null } | null };
type Invite = { campaigns: { subject: string; created_at: string; offerings: { title: string } | null } | null };

export default async function Person({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const [{ data: profile }, { data: regs }, { data: invites }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("registrations").select("id, status, submitted_at, checked_in_at, ticket_code, offerings(id, title, starts_at, offering_types(name, kind))").eq("user_id", id).order("submitted_at", { ascending: false }),
    supabase.from("campaign_recipients").select("campaigns(subject, created_at, offerings(title))").eq("user_id", id),
    supabase.from("user_roles").select("role").eq("user_id", id),
  ]);
  if (!profile) notFound();
  const p = profile as ProfileRow;
  const registrations = (regs ?? []) as unknown as Reg[];
  const { data: fb } = registrations.length
    ? await supabase.from("feedback_responses").select("registration_id, anonymous").in("registration_id", registrations.map((r) => r.id))
    : { data: [] as { registration_id: string; anonymous: boolean }[] };
  const gave = new Set((fb ?? []).map((f) => f.registration_id));
  const inv = ((invites ?? []) as unknown as Invite[]).map((i) => i.campaigns).filter((c): c is NonNullable<Invite["campaigns"]> => !!c).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const active = registrations.filter((r) => r.status !== "cancelled");
  const age = ageFrom(p.date_of_birth);

  const details: [string, string | null | undefined][] = [
    ["Email", p.email], ["WhatsApp", p.phone], ["Gender", p.gender], ["Age", age !== null ? String(age) : null], ["CNIC", p.cnic],
    ["Occupation", p.occupation_type], ["University", p.university], ["Degree", p.degree], ["Year", p.education_year],
    ["Company", p.company], ["Job title", p.job_title], ["Area", p.area], ["Address", p.address_line], ["Heard about us", p.heard_from],
    ["Email updates", p.email_opt_in ? "Opted in" : "Opted out"], ["WhatsApp updates", p.whatsapp_opt_in ? "Opted in" : "Opted out"],
    ["Joined", fmtDate(p.created_at, { dateStyle: "medium" })],
  ];

  return (
    <AdminShell isAdmin current="/admin/people">
      <AdminHeader title={p.full_name ?? p.email} crumb={<Link href="/admin/people">← People</Link>}
        sub={[p.area, p.occupation_type && p.occupation_type[0]!.toUpperCase() + p.occupation_type.slice(1), (roles ?? []).length ? `Staff: ${(roles ?? []).map((r) => r.role.replace("_", " ")).join(", ")}` : null].filter(Boolean).join(" · ")}
        actions={<>
          {p.phone && <a className="hk-btn hk-btn--ghost hk-btn--sm" href={`https://wa.me/${p.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          <a className="hk-btn hk-btn--primary hk-btn--sm" href={`mailto:${p.email}`}>Email</a>
        </>} />
      <div className="ad-stats">
        <div className="ad-stat"><span>Registrations</span><strong>{active.length}</strong></div>
        <div className="ad-stat"><span>Checked in</span><strong>{active.filter((r) => r.checked_in_at).length}</strong><small>QR events only</small></div>
        <div className="ad-stat"><span>Feedback given</span><strong>{gave.size}</strong></div>
        <div className="ad-stat"><span>Invites received</span><strong>{inv.length}</strong></div>
      </div>
      <div className="ad-grid">
        <section className="ad-card" style={{ padding: 0 }}>
          <div className="ad-card__head" style={{ padding: "20px 20px 0" }}><h2>History</h2></div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Course or event</th><th>Date</th><th>Status</th><th>Checked in</th><th>Feedback</th></tr></thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <td>{r.offerings ? <Link href={`/admin/offerings/${r.offerings.id}/responses`}>{r.offerings.title}</Link> : "Deleted"}<div className="ad-muted">{r.offerings?.offering_types?.name}</div></td>
                    <td className="ad-muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.offerings?.starts_at ?? r.submitted_at, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td className="ad-muted">{r.checked_in_at ? fmtDate(r.checked_in_at, { hour: "numeric", minute: "2-digit" }) : ""}</td>
                    <td className="ad-muted">{gave.has(r.id) ? "Yes" : ""}</td>
                  </tr>
                ))}
                {registrations.length === 0 && <tr><td colSpan={5} className="ad-muted" style={{ padding: 24 }}>Has not registered for anything yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {inv.length > 0 && (
            <div style={{ padding: 20 }}>
              <h2 style={{ fontSize: 17, margin: "0 0 10px" }}>Invites received</h2>
              <div className="ad-list">{inv.map((c, i) => <div key={i}><span>{c.offerings?.title ?? c.subject}</span><span className="ad-muted">{fmtDate(c.created_at, { day: "numeric", month: "short", year: "numeric" })}</span></div>)}</div>
            </div>
          )}
        </section>
        <aside className="ad-card ad-detail">
          <h2 style={{ margin: 0 }}>Profile</h2>
          <dl style={{ margin: 0 }}>{details.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd style={{ textTransform: k === "Gender" || k === "Occupation" ? "capitalize" : undefined }}>{v}</dd></div>)}</dl>
          {p.interests.length > 0 && <div><dt className="ad-muted" style={{ fontSize: 12 }}>Interests</dt><div className="ad-filters" style={{ marginTop: 6 }}>{p.interests.map((i) => <span key={i} className="ad-tag">{i}</span>)}</div></div>}
        </aside>
      </div>
    </AdminShell>
  );
}
