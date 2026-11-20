import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, AdminShell, StatusPill } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { fmtDate } from "@/lib/time";
import { OfferingTabs } from "../tabs";
import { bulkStatus, saveNote } from "./actions";
import { OCC, answerText, loadResponses } from "./data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Responses" };

const FILTERS = [["all", "All"], ["confirmed", "Confirmed"], ["submitted", "Applied"], ["waitlisted", "Waitlist"], ["attended", "Attended"], ["cancelled", "Cancelled"]] as const;

export default async function Responses({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; q?: string; r?: string }> }) {
  const { supabase } = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { offering, rows, custom } = await loadResponses(supabase, id);
  if (!offering) notFound();
  const kind = offering.offering_types?.kind ?? "event";
  const status = sp.status ?? "all";
  const q = (sp.q ?? "").trim().toLowerCase();

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const active = rows.filter((r) => r.status !== "cancelled");
  const visible = rows.filter((r) =>
    (status === "all" ? r.status !== "cancelled" : r.status === status) &&
    (!q || [r.profiles?.full_name, r.profiles?.email, r.profiles?.phone, r.ticket_code].some((v) => v?.toLowerCase().includes(q))));
  const selected = rows.find((r) => r.id === sp.r);
  const href = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, q: sp.q, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/offerings/${id}/responses?${p.toString()}`;
  };
  const also = selected
    ? await supabase.from("registrations").select("offerings(title)").eq("user_id", selected.user_id).neq("offering_id", id).neq("status", "cancelled")
    : null;

  return (
    <AdminShell isAdmin current="/admin/offerings">
      <AdminHeader title={offering.title} crumb={<><Link href="/admin/offerings">Courses and events</Link> / {kind === "course" ? "Applications" : "Responses"}</>}
        actions={<>
          {kind === "event" && <Link href={`/admin/check-in/${id}`} className="hk-btn hk-btn--ghost hk-btn--sm">Open door check-in</Link>}
          <a href={`/admin/offerings/${id}/responses/export`} className="hk-btn hk-btn--primary hk-btn--sm">Export to Excel (CSV)</a>
        </>} />
      <OfferingTabs id={id} current="responses" kind={kind} />

      <div className="ad-stats">
        <div className="ad-stat"><span>Total</span><strong>{active.length}</strong><small>{count("cancelled")} cancelled</small></div>
        {kind === "event"
          ? <><div className="ad-stat"><span>Confirmed</span><strong>{count("confirmed") + count("attended")}</strong><small>{offering.capacity ? `of ${offering.capacity} seats` : "no seat limit"}</small></div>
            <div className="ad-stat"><span>Waitlist</span><strong>{count("waitlisted")}</strong><small>move up automatically</small></div>
            <div className="ad-stat"><span>Attended</span><strong>{count("attended")}</strong><small>{offering.starts_at ? fmtDate(offering.starts_at, { day: "numeric", month: "short" }) : ""}</small></div></>
          : <div className="ad-stat"><span>To review</span><strong>{count("submitted")}</strong><small>applications</small></div>}
      </div>

      <div className="ad-filters">
        {FILTERS.filter(([s]) => kind === "course" ? s !== "attended" : s !== "submitted").map(([s, label]) => (
          <Link key={s} href={href({ status: s, r: undefined })} className="ad-chip" aria-current={status === s}>{label}{s !== "all" ? ` (${count(s)})` : ""}</Link>
        ))}
        <form style={{ marginLeft: "auto" }}>
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={sp.q} placeholder="Search name, email, phone" className="ad-input" style={{ width: 240 }} />
        </form>
      </div>

      <div className="ad-grid">
        <form action={bulkStatus} className="ad-card" style={{ padding: 0 }}>
          <input type="hidden" name="offering_id" value={id} />
          <div className="ad-bulk" style={{ borderRadius: "16px 16px 0 0" }}>
            <span>With selected:</span>
            <select name="status" className="ad-input" defaultValue={kind === "event" ? "attended" : "confirmed"}>
              {kind === "event" && <option value="attended">Mark attended</option>}
              <option value="confirmed">{kind === "course" ? "Accept (confirmed)" : "Confirm"}</option>
              <option value="waitlisted">Move to waitlist</option>
              {kind === "event" && <option value="no_show">Mark no-show</option>}
              <option value="cancelled">Cancel</option>
            </select>
            <button className="hk-btn hk-btn--on-dark hk-btn--sm">Apply</button>
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th style={{ width: 36 }} /><th>Name</th><th>Area</th><th>Occupation</th><th>{kind === "course" ? "Applied" : "Registered"}</th><th>Status</th></tr></thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} style={r.id === sp.r ? { background: "#EAF2FB" } : undefined}>
                    <td><input type="checkbox" name="ids" value={r.id} className="ad-check" aria-label={`Select ${r.profiles?.full_name ?? ""}`} /></td>
                    <td><Link href={href({ r: r.id })}>{r.profiles?.full_name ?? "(no name)"}</Link><div className="ad-muted">{r.profiles?.phone}</div></td>
                    <td className="ad-muted">{r.profiles?.area}</td>
                    <td className="ad-muted">{OCC[r.profiles?.occupation_type ?? ""] ?? ""}</td>
                    <td className="ad-muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.submitted_at, { day: "numeric", month: "short" })}</td>
                    <td><StatusPill status={r.status} />{r.checked_in_at && <div className="ad-muted">in {fmtDate(r.checked_in_at, { hour: "numeric", minute: "2-digit" })}</div>}</td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={6} className="ad-muted" style={{ padding: 24 }}>No one here yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </form>

        <aside className="ad-card ad-sticky" style={{ display: "block" }}>
          {selected ? (
            <div className="ad-detail">
              <div className="ad-card__head"><h2>{selected.profiles?.full_name}</h2><Link href={href({ r: undefined })} aria-label="Close" className="ad-muted">✕</Link></div>
              <div style={{ fontSize: 14 }}>
                {selected.profiles?.email}<br />{selected.profiles?.phone}
                {selected.ticket_code && <><br />Ticket <strong>{selected.ticket_code}</strong></>}
              </div>
              <dl style={{ margin: "8px 0 0", background: "#F4F6FA", borderRadius: 12, padding: 12 }}>
                {[
                  ["Gender", selected.profiles?.gender === "male" ? "Male" : selected.profiles?.gender === "female" ? "Female" : ""],
                  ["Date of birth", selected.profiles?.date_of_birth ? fmtDate(selected.profiles.date_of_birth, { day: "numeric", month: "short", year: "numeric" }) : ""],
                  ["CNIC", selected.profiles?.cnic],
                  ["Occupation", [OCC[selected.profiles?.occupation_type ?? ""], selected.profiles?.job_title, selected.profiles?.company].filter(Boolean).join(", ")],
                  ["Education", [selected.profiles?.degree, selected.profiles?.university, selected.profiles?.education_year].filter(Boolean).join(", ")],
                  ["Area", [selected.profiles?.area, selected.profiles?.address_line].filter(Boolean).join(" · ")],
                  ["Interests", (selected.profiles?.interests ?? []).join(", ")],
                ].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
              {custom.length > 0 && (
                <dl style={{ margin: 0, padding: 12, border: "1px solid var(--hk-border)", borderRadius: 12 }}>
                  {custom.map((c) => <div key={c.key}><dt>{c.label}</dt><dd>{answerText(selected.answers?.[c.key]) || <span className="ad-muted">No answer</span>}</dd></div>)}
                </dl>
              )}
              <form action={saveNote} className="ad-fields" style={{ marginTop: 6 }}>
                <input type="hidden" name="id" value={selected.id} /><input type="hidden" name="offering_id" value={id} />
                <label className="ad-label">Admin note <small>only admins see this</small><textarea name="admin_notes" className="ad-input" rows={3} defaultValue={selected.admin_notes ?? ""} /></label>
                <button className="hk-btn hk-btn--ghost hk-btn--sm" style={{ justifySelf: "start" }}>Save note</button>
              </form>
              {also && (also.data ?? []).length > 0 && (
                <p className="ad-muted" style={{ margin: 0 }}>Also registered for: {(also.data as unknown as { offerings: { title: string } | null }[]).map((a) => a.offerings?.title).filter(Boolean).join(", ")}</p>
              )}
            </div>
          ) : (
            <p className="ad-muted" style={{ margin: 0 }}>Click a name to see their full details and answers. Tick rows to change their status together.</p>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
