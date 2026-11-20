import type { Metadata } from "next";
import Link from "next/link";
import type { RequestKind, RequestRow } from "@hikmah/db";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { fmtDate, timeAgo } from "@/lib/time";
import { updateRequest } from "./actions";
import { requestSections, requestSummary } from "./view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Requests" };

const KINDS: [RequestKind, string][] = [["hifz", "Hifz"], ["mentorship", "Mentorship"], ["corporate", "Hikmah at Work"]];
const STATUS_LABEL: Record<string, string> = { new: "New", in_progress: "In progress", done: "Done", archived: "Archived" };

export default async function Requests({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string; r?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const kind = (KINDS.some(([k]) => k === sp.kind) ? sp.kind : "hifz") as RequestKind;
  const status = sp.status ?? "open";

  const [{ data }, { data: allNew }] = await Promise.all([
    supabase.from("requests").select("*").eq("kind", kind).order("created_at", { ascending: false }).limit(500),
    supabase.from("requests").select("kind").eq("status", "new"),
  ]);
  const rows = (data ?? []) as RequestRow[];
  const newCount = (k: string) => (allNew ?? []).filter((r) => r.kind === k).length;
  const visible = rows.filter((r) => (status === "open" ? r.status === "new" || r.status === "in_progress" : r.status === status));
  const selected = rows.find((r) => r.id === sp.r);
  const href = (x: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ kind, status, ...x })) if (v) p.set(k, v);
    return `/admin/requests?${p.toString()}`;
  };

  return (
    <AdminShell isAdmin current="/admin/requests">
      <AdminHeader title="Requests" sub="Submissions from the Hifz, Mentorship Circle and Hikmah at Work pages. No account needed to submit."
        actions={<a href={`/admin/requests/export?kind=${kind}`} className="hk-btn hk-btn--primary hk-btn--sm">Export to Excel (CSV)</a>} />
      <nav className="ad-tabs">
        {KINDS.map(([k, label]) => <Link key={k} href={href({ kind: k, r: undefined })} aria-current={kind === k ? "page" : undefined}>{label}{newCount(k) ? ` · ${newCount(k)} new` : ""}</Link>)}
      </nav>
      <div className="ad-filters">
        {[["open", "Open"], ["new", "New"], ["in_progress", "In progress"], ["done", "Done"], ["archived", "Archived"]].map(([s, label]) => (
          <Link key={s} href={href({ status: s, r: undefined })} className="ad-chip" aria-current={status === s}>{label}</Link>
        ))}
      </div>
      <div className="ad-grid">
        <section className="ad-card" style={{ padding: 0 }}>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>{kind === "hifz" ? "Parent" : kind === "corporate" ? "Contact" : "Name"}</th><th>{kind === "hifz" ? "Children" : kind === "corporate" ? "Organisation" : "Area"}</th><th>Received</th><th>Status</th></tr></thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} style={r.id === sp.r ? { background: "#EAF2FB" } : undefined}>
                    <td><Link href={href({ r: r.id })}>{r.name}</Link><div className="ad-muted">{r.phone}</div></td>
                    <td className="ad-muted" style={{ maxWidth: 320 }}>{requestSummary(r.kind, r.payload as Record<string, unknown>)}</td>
                    <td className="ad-muted" style={{ whiteSpace: "nowrap" }}>{timeAgo(r.created_at) === "just now" ? "just now" : `${timeAgo(r.created_at)} ago`}</td>
                    <td><span className={`ad-pill ad-pill--${r.status === "new" ? "draft" : r.status === "done" ? "confirmed" : r.status === "in_progress" ? "waitlisted" : "archived"}`}>{STATUS_LABEL[r.status]}</span></td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={4} className="ad-muted" style={{ padding: 24 }}>Nothing here.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="ad-card ad-sticky" style={{ display: "block" }}>
          {selected ? (
            <div className="ad-detail">
              <div className="ad-card__head"><h2>{selected.name}</h2><Link href={href({ r: undefined })} aria-label="Close" className="ad-muted">✕</Link></div>
              <div style={{ fontSize: 14 }}>
                {selected.email && <><a href={`mailto:${selected.email}`}>{selected.email}</a><br /></>}
                {selected.phone && <a href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{selected.phone} (WhatsApp)</a>}
                <div className="ad-muted">Received {fmtDate(selected.created_at, { dateStyle: "medium", timeStyle: "short" })}</div>
              </div>
              {requestSections(selected.kind, selected.payload as Record<string, unknown>).map((s, i) => (
                <dl key={i} style={{ margin: 0, padding: 12, borderRadius: 12, background: i % 2 ? "#fff" : "#F4F6FA", border: i % 2 ? "1px solid var(--hk-border)" : 0 }}>
                  {s.title && <strong style={{ display: "block", marginBottom: 6 }}>{s.title}</strong>}
                  {s.rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                </dl>
              ))}
              <form action={updateRequest} className="ad-fields">
                <input type="hidden" name="id" value={selected.id} />
                <label className="ad-label">Status
                  <select name="status" className="ad-input" defaultValue={selected.status}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="ad-label">Admin note <small>only admins see this</small><textarea name="admin_notes" className="ad-input" rows={3} defaultValue={selected.admin_notes ?? ""} /></label>
                <button className="hk-btn hk-btn--primary hk-btn--sm" style={{ justifySelf: "start" }}>Save</button>
              </form>
            </div>
          ) : (
            <p className="ad-muted" style={{ margin: 0 }}>Click a name to see the full submission, then set it to In progress or Done as you follow up.</p>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
