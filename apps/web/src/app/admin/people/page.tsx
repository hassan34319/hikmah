import type { Metadata } from "next";
import Link from "next/link";
import { GENDER_OPTIONS, INTEREST_OPTIONS, OCCUPATION_OPTIONS, type PersonResult, type SegmentRow } from "@hikmah/db";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { asJson, describeRules, isEmpty, paramsFromRules, rulesFromParams, toQuery, type Params, type PeopleRules } from "@/lib/people";
import { fmtDate, timeAgo } from "@/lib/time";
import { deleteSegment, saveSegment } from "./actions";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "People" };

type Off = { id: string; title: string; starts_at: string | null; status: string; qr_tickets_enabled: boolean; offering_types: { slug: string; name: string; kind: "course" | "event" } | null };
const SHOW = 200;

export default async function People({ searchParams }: { searchParams: Promise<Params> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const rules = rulesFromParams(sp);
  const p = paramsFromRules(rules);
  const segId = typeof sp.seg === "string" ? sp.seg : undefined;

  const [{ data: people, error }, { data: offs }, { data: types }, { data: segs }, { data: recent }] = await Promise.all([
    supabase.rpc("people_search", { p_rules: asJson(rules) }),
    supabase.from("offerings").select("id, title, starts_at, status, qr_tickets_enabled, offering_types(slug, name, kind)").neq("status", "draft").order("starts_at", { ascending: false, nullsFirst: false }).limit(300),
    supabase.from("offering_types").select("slug, name, kind").order("sort_order"),
    supabase.from("segments").select("*").order("created_at", { ascending: false }),
    supabase.from("campaigns").select("id, subject, recipient_count, sent_count, created_at, offerings(title)").order("created_at", { ascending: false }).limit(5),
  ]);
  const rows = (people ?? []) as PersonResult[];
  const offerings = (offs ?? []) as unknown as Off[];
  const segments = (segs ?? []) as SegmentRow[];
  const seg = segments.find((s) => s.id === segId);
  const reachable = rows.filter((r) => r.email_opt_in).length;
  const names = {
    offering: (id: string) => offerings.find((o) => o.id === id)?.title ?? "an event",
    type: (slug: string) => (types ?? []).find((t) => t.slug === slug)?.name ?? slug,
  };
  const now = Date.now();
  const upcoming = offerings.filter((o) => o.status === "published" && (o.offering_types?.kind === "course" || (o.starts_at && new Date(o.starts_at).getTime() > now)));
  const has = (key: string, v: string) => (p[key] ?? "").split(",").map((x) => x.trim()).includes(v);
  const qs = toQuery(p);
  const label = (o: Off) => `${o.title}${o.starts_at ? ` · ${fmtDate(o.starts_at, { day: "numeric", month: "short", year: "numeric" })}` : ""}`;

  return (
    <AdminShell isAdmin current="/admin/people">
      <AdminHeader title="People" sub="Everyone who has made an account. Filter by who they are and what they have attended, then save the group, export it or invite them to an event."
        actions={<a href={`/admin/people/export?${qs}`} className="hk-btn hk-btn--primary hk-btn--sm">Export to Excel (CSV)</a>} />

      {segments.length > 0 && (
        <div className="ad-filters">
          <span className="ad-muted" style={{ fontWeight: 700 }}>Saved groups</span>
          {segments.map((s) => (
            <Link key={s.id} className="ad-chip" aria-current={s.id === segId} title={describeRules(s.rules as PeopleRules, names)}
              href={`/admin/people?${toQuery({ ...paramsFromRules(s.rules as PeopleRules), seg: s.id })}`}>{s.name}</Link>
          ))}
        </div>
      )}

      <div className="ad-grid">
        <div className="ad-form__col">
          <div className="ad-stats">
            <div className="ad-stat"><span>Matching people</span><strong>{rows.length}</strong><small>{describeRules(rules, names)}</small></div>
            <div className="ad-stat"><span>Can be emailed</span><strong>{reachable}</strong><small>opted in to emails</small></div>
            <div className="ad-stat"><span>WhatsApp opted in</span><strong>{rows.filter((r) => r.whatsapp_opt_in).length}</strong><small>for broadcast lists</small></div>
          </div>
          {error && <div className="ad-alert ad-alert--err">Could not search: {error.message}</div>}

          <div className="ad-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems: "start" }}>
            <section className="ad-card">
              <h2>Invite this group</h2>
              <InviteForm rules={JSON.stringify(rules)} segmentId={seg?.id} reachable={reachable}
                options={upcoming.map((o) => ({ id: o.id, label: label(o), group: o.offering_types?.kind === "course" ? "Courses" : "Upcoming events" }))} />
            </section>
            <section className="ad-card">
              <h2>{seg ? `Group: ${seg.name}` : "Save as a group"}</h2>
              <form action={saveSegment} className="ad-fields">
                <input type="hidden" name="rules" value={JSON.stringify(rules)} />
                {seg && <input type="hidden" name="segment_id" value={seg.id} />}
                <p className="ad-muted" style={{ margin: 0 }}>A group saves these filters, not a fixed list, so new people who match join it automatically.</p>
                <label className="ad-label">Group name<input name="name" className="ad-input" required maxLength={80} defaultValue={seg?.name} placeholder="e.g. FGF regulars in Gulshan" /></label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {seg && <button name="mode" value="update" className="hk-btn hk-btn--primary hk-btn--sm">Update group</button>}
                  <button name="mode" value="new" className={`hk-btn hk-btn--${seg ? "ghost" : "primary"} hk-btn--sm`} disabled={isEmpty(rules) && !seg}>{seg ? "Save as new" : "Save group"}</button>
                </div>
              </form>
              {seg && <form action={deleteSegment} style={{ marginTop: 10 }}><input type="hidden" name="segment_id" value={seg.id} /><button className="ad-icon-btn ad-icon-btn--danger">Delete group</button></form>}
              {(recent ?? []).length > 0 && (
                <>
                  <h2 style={{ marginTop: 22 }}>Recent invites</h2>
                  <div className="ad-list">
                    {(recent ?? []).map((c) => (
                      <div key={c.id}><span>{(c.offerings as unknown as { title: string } | null)?.title ?? c.subject}<br /><span className="ad-muted">{timeAgo(c.created_at) === "just now" ? "just now" : `${timeAgo(c.created_at)} ago`}</span></span><span className="ad-muted">{c.sent_count} sent</span></div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          <section className="ad-card" style={{ padding: 0 }}>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Name</th><th>Area</th><th>Occupation</th><th>Registrations</th><th>Last registered</th><th>Email</th></tr></thead>
                <tbody>
                  {rows.slice(0, SHOW).map((r) => (
                    <tr key={r.user_id}>
                      <td><Link href={`/admin/people/${r.user_id}`}>{r.full_name ?? r.email}</Link><div className="ad-muted">{r.phone}</div></td>
                      <td className="ad-muted">{r.area}</td>
                      <td className="ad-muted" style={{ textTransform: "capitalize" }}>{r.occupation_type}</td>
                      <td>{r.registrations}</td>
                      <td className="ad-muted" style={{ whiteSpace: "nowrap" }}>{r.last_registered_at ? fmtDate(r.last_registered_at, { day: "numeric", month: "short", year: "numeric" }) : "Never"}</td>
                      <td>{r.email_opt_in ? <span className="ad-pill ad-pill--confirmed">Opted in</span> : <span className="ad-pill">Off</span>}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={6} className="ad-muted" style={{ padding: 24 }}>Nobody matches these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            {rows.length > SHOW && <p className="ad-muted" style={{ padding: "10px 14px", margin: 0 }}>Showing the first {SHOW} of {rows.length}. Export to see everyone.</p>}
          </section>
        </div>

        <aside className="ad-card">
          <div className="ad-card__head"><h2>Filters</h2>{!isEmpty(rules) && <Link href="/admin/people" className="ad-muted">Clear all</Link>}</div>
          <form method="get" className="ad-fields">
            {seg && <input type="hidden" name="seg" value={seg.id} />}
            <label className="ad-label">Search<input name="q" className="ad-input" defaultValue={p.q} placeholder="Name, email or phone" /></label>

            <fieldset className="ad-fset">
              <legend>What they attended</legend>
              <label className="ad-label">They
                <select name="em" className="ad-input" defaultValue={p.em ?? ""}>
                  <option value="">Any, no event filter</option>
                  <option value="registered">Registered for</option>
                  <option value="checked_in">Checked in at (QR events only)</option>
                  <option value="feedback">Gave feedback on</option>
                </select>
              </label>
              <details className="ad-pick" open={!!p.ev}>
                <summary>Specific events {p.ev ? `(${p.ev.split(",").length})` : "(any)"}</summary>
                <div className="ad-pick__list">
                  {offerings.map((o) => (
                    <label key={o.id}><input type="checkbox" name="ev" value={o.id} defaultChecked={has("ev", o.id)} />
                      <span>{o.title}<small>{[o.offering_types?.name, o.starts_at && fmtDate(o.starts_at, { day: "numeric", month: "short", year: "numeric" }), o.qr_tickets_enabled && "QR"].filter(Boolean).join(" · ")}</small></span></label>
                  ))}
                </div>
              </details>
              <div className="ad-chipset">
                {(types ?? []).map((t) => <label key={t.slug}><input type="checkbox" name="et" value={t.slug} defaultChecked={has("et", t.slug)} /><span>{t.name}</span></label>)}
              </div>
              <label className="ad-label">Series or title contains<input name="es" className="ad-input" defaultValue={p.es} placeholder="e.g. Feel Good Fridays" /></label>
              <div className="ad-row">
                <label className="ad-label">From<input type="date" name="since" className="ad-input" defaultValue={p.since} /></label>
                <label className="ad-label">To<input type="date" name="until" className="ad-input" defaultValue={p.until} /></label>
              </div>
              <label className="ad-label">At least this many times<input type="number" min={1} max={50} name="min" className="ad-input" defaultValue={p.min ?? ""} placeholder="1" /></label>
              <small className="ad-muted">Checked in only works for events that used QR tickets at the door.</small>
            </fieldset>

            <fieldset className="ad-fset">
              <legend>Leave out</legend>
              <label className="ad-label">Already registered for
                <select name="x" className="ad-input" defaultValue={p.x ?? ""}>
                  <option value="">Nobody left out</option>
                  {offerings.map((o) => <option key={o.id} value={o.id}>{label(o)}</option>)}
                </select>
              </label>
              <label className="ad-label">Applied for a course
                <select name="ac" className="ad-input" defaultValue={p.ac ?? ""}>
                  <option value="">Either</option><option value="yes">Yes, has applied</option><option value="no">No, never applied</option>
                </select>
              </label>
            </fieldset>

            <fieldset className="ad-fset">
              <legend>Who they are</legend>
              <label className="ad-label">Area <small>comma separated, partial names work</small><input name="area" className="ad-input" defaultValue={p.area} placeholder="e.g. Gulshan, DHA" /></label>
              <div className="ad-chipset">{OCCUPATION_OPTIONS.map((o) => <label key={o.value}><input type="checkbox" name="occ" value={o.value} defaultChecked={has("occ", o.value)} /><span>{o.label}</span></label>)}</div>
              <div className="ad-chipset">{GENDER_OPTIONS.map((o) => <label key={o.value}><input type="checkbox" name="g" value={o.value} defaultChecked={has("g", o.value)} /><span>{o.label}</span></label>)}</div>
              <div className="ad-row">
                <label className="ad-label">Age from<input type="number" min={5} max={100} name="amin" className="ad-input" defaultValue={p.amin ?? ""} /></label>
                <label className="ad-label">Age to<input type="number" min={5} max={100} name="amax" className="ad-input" defaultValue={p.amax ?? ""} /></label>
              </div>
              <details className="ad-pick" open={!!p.int}>
                <summary>Interests {p.int ? `(${p.int.split(",").length})` : "(any)"}</summary>
                <div className="ad-chipset" style={{ marginTop: 8 }}>{INTEREST_OPTIONS.map((i) => <label key={i}><input type="checkbox" name="int" value={i} defaultChecked={has("int", i)} /><span>{i}</span></label>)}</div>
              </details>
              <label className="ad-label">Email updates
                <select name="eo" className="ad-input" defaultValue={p.eo ?? ""}><option value="">Either</option><option value="yes">Opted in</option><option value="no">Opted out</option></select>
              </label>
              <label className="ad-label">WhatsApp updates
                <select name="wo" className="ad-input" defaultValue={p.wo ?? ""}><option value="">Either</option><option value="yes">Opted in</option><option value="no">Opted out</option></select>
              </label>
            </fieldset>
            <button className="hk-btn hk-btn--primary">Show people</button>
          </form>
        </aside>
      </div>
    </AdminShell>
  );
}
