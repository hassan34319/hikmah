import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/admin";
import { fmtDate, timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const staff = await requireStaff();
  if (!staff.isAdmin) redirect(staff.isInterviewer ? "/admin/interviews" : "/admin/check-in");
  const { supabase } = staff;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nowIso = now.toISOString();

  const [open, regsWeek, people, peopleMonth, applications, latest, newRequests] = await Promise.all([
    supabase.from("offerings")
      .select("id, slug, title, status, capacity, poster_url, starts_at, ends_at, registration_closes_at, offering_types(kind, name)")
      .eq("status", "published")
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("starts_at", { ascending: true, nullsFirst: false }),
    supabase.from("registrations").select("id", { count: "exact", head: true }).gte("submitted_at", weekAgo),
    supabase.from("profiles").select("id", { count: "exact", head: true }).not("profile_completed_at", "is", null),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    supabase.from("registrations").select("id, offerings!inner(offering_types!inner(kind))", { count: "exact", head: true })
      .eq("status", "submitted").eq("offerings.offering_types.kind", "course"),
    supabase.from("registrations")
      .select("id, status, submitted_at, profiles(full_name), offerings(id, title)")
      .order("submitted_at", { ascending: false }).limit(8),
    supabase.from("requests").select("kind").eq("status", "new"),
  ]);

  type Off = { id: string; slug: string; title: string; capacity: number | null; poster_url: string | null; starts_at: string | null; registration_closes_at: string | null; offering_types: { kind: string; name: string } | null };
  const offerings = (open.data ?? []) as unknown as Off[];
  const ids = offerings.map((o) => o.id);
  const { data: regRows } = ids.length
    ? await supabase.from("registrations").select("offering_id, status, submitted_at").in("offering_id", ids)
    : { data: [] as { offering_id: string; status: string; submitted_at: string }[] };
  const tally = new Map<string, { taken: number; total: number; recent: number; waitlist: number }>();
  for (const r of regRows ?? []) {
    const t = tally.get(r.offering_id) ?? { taken: 0, total: 0, recent: 0, waitlist: 0 };
    if (r.status !== "cancelled") t.total++;
    if (r.status === "confirmed" || r.status === "attended") t.taken++;
    if (r.status === "waitlisted") t.waitlist++;
    if (r.submitted_at >= weekAgo && r.status !== "cancelled") t.recent++;
    tally.set(r.offering_id, t);
  }

  const events = offerings.filter((o) => o.offering_types?.kind === "event");
  const upcomingWeek = events.filter((o) => o.starts_at && o.starts_at <= weekAhead).length;
  const attention: { tone: "warn" | "info"; text: React.ReactNode }[] = [];
  for (const o of events) {
    const t = tally.get(o.id);
    if (o.capacity && t && t.taken / o.capacity >= 0.9) attention.push({ tone: "warn", text: <><Link href={`/admin/offerings/${o.id}/responses`}><strong>{o.title}</strong></Link> is {Math.round((t.taken / o.capacity) * 100)}% full{t.waitlist ? `, ${t.waitlist} on the waitlist` : ""}.</> });
    if (!o.poster_url) attention.push({ tone: "info", text: <><Link href={`/admin/offerings/${o.id}`}><strong>{o.title}</strong></Link> has no poster yet.</> });
  }
  const reqLabels: Record<string, string> = { hifz: "Hifz registration", mentorship: "Mentorship request", corporate: "Hikmah at Work invitation" };
  for (const k of ["hifz", "mentorship", "corporate"]) {
    const n = (newRequests.data ?? []).filter((r) => r.kind === k).length;
    if (n) attention.push({ tone: "warn", text: <Link href={`/admin/requests?kind=${k}`}><strong>{n} new {reqLabels[k]}{n === 1 ? "" : "s"}</strong> waiting for a reply.</Link> });
  }
  if (applications.count) attention.push({ tone: "info", text: <>{applications.count} course application{applications.count === 1 ? " is" : "s are"} waiting for review.</> });

  type Latest = { id: string; status: string; submitted_at: string; profiles: { full_name: string | null } | null; offerings: { id: string; title: string } | null };

  return (
    <AdminShell isAdmin current="/admin">
      <AdminHeader
        title="Overview"
        crumb="Assalamu alaikum"
        actions={<>
          <Link href="/admin/offerings/new?kind=course" className="hk-btn hk-btn--ghost hk-btn--sm">New course</Link>
          <Link href="/admin/offerings/new?kind=event" className="hk-btn hk-btn--primary hk-btn--sm">+ New event</Link>
        </>}
      />
      <div className="ad-stats">
        <div className="ad-stat"><span>Open for registration</span><strong>{offerings.length}</strong><small>{events.length} events, {offerings.length - events.length} courses</small></div>
        <div className="ad-stat"><span>New this week</span><strong>{regsWeek.count ?? 0}</strong><small>registrations and applications</small></div>
        <div className="ad-stat"><span>People with profiles</span><strong>{people.count ?? 0}</strong><small>+{peopleMonth.count ?? 0} this month</small></div>
        <div className="ad-stat"><span>Events in the next 7 days</span><strong>{upcomingWeek}</strong><small>on the calendar</small></div>
      </div>

      <div className="ad-grid">
        <section className="ad-card">
          <div className="ad-card__head"><h2>Open registrations</h2><Link href="/admin/offerings" style={{ fontSize: 14, fontWeight: 600 }}>See all</Link></div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Course or event</th><th>When</th><th>Filled</th><th>New (7d)</th></tr></thead>
              <tbody>
                {offerings.map((o) => {
                  const t = tally.get(o.id) ?? { taken: 0, total: 0, recent: 0, waitlist: 0 };
                  const pct = o.capacity ? Math.min(100, Math.round((t.taken / o.capacity) * 100)) : null;
                  return (
                    <tr key={o.id}>
                      <td><Link href={`/admin/offerings/${o.id}/responses`}>{o.title}</Link><div className="ad-muted">{o.offering_types?.name}</div></td>
                      <td className="ad-muted">{o.starts_at ? fmtDate(o.starts_at) : "Ongoing"}</td>
                      <td>
                        {pct !== null
                          ? <><div className={`ad-bar${pct >= 90 ? " ad-bar--hot" : ""}`}><span style={{ width: `${pct}%` }} /></div><div className="ad-muted">{t.taken} / {o.capacity}</div></>
                          : <span className="ad-muted">{t.total} {o.offering_types?.kind === "course" ? "applied" : "registered"}</span>}
                      </td>
                      <td>{t.recent > 0 ? <span className="ad-pill ad-pill--draft">+{t.recent}</span> : <span className="ad-muted">0</span>}</td>
                    </tr>
                  );
                })}
                {offerings.length === 0 && <tr><td colSpan={4} className="ad-muted">Nothing is open right now. <Link href="/admin/offerings/new?kind=event">Create an event</Link>.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ display: "grid", gap: 20 }}>
          <section className="ad-card">
            <h2>Needs attention</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {attention.length === 0 && <div className="ad-alert ad-alert--ok">All good. Nothing needs attention.</div>}
              {attention.map((a, i) => <div key={i} className={`ad-alert${a.tone === "warn" ? " ad-alert--warn" : ""}`}>{a.text}</div>)}
            </div>
          </section>
          <section className="ad-card">
            <h2>Latest registrations</h2>
            <div className="ad-list">
              {((latest.data ?? []) as unknown as Latest[]).map((r) => (
                <Link key={r.id} href={r.offerings ? `/admin/offerings/${r.offerings.id}/responses?r=${r.id}` : "#"}>
                  <span><strong>{r.profiles?.full_name ?? "Someone"}</strong> · {r.offerings?.title}</span>
                  <span className="ad-muted">{timeAgo(r.submitted_at)}</span>
                </Link>
              ))}
              {(latest.data ?? []).length === 0 && <span className="ad-muted">No registrations yet.</span>}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
