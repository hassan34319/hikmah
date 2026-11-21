import type { Metadata } from "next";
import Link from "next/link";
import type { AdmissionRow } from "@hikmah/db";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireInterviewer } from "@/lib/admin";
import { GAMES, gameDetail } from "@/lib/admissions";
import { fmtDate } from "@/lib/time";
import { ScoreForm } from "./ScoreForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Interviews" };

type Row = AdmissionRow & {
  profiles: { full_name: string | null; phone: string | null; area: string | null; occupation_type: string | null; university: string | null; company: string | null; date_of_birth: string | null } | null;
  interview_slots: { starts_at: string; venues: { name: string } | null } | null;
  offerings: { title: string } | null;
};

const day = (iso: string) => fmtDate(iso, { weekday: "long", day: "numeric", month: "long" });
const time = (iso: string) => fmtDate(iso, { hour: "numeric", minute: "2-digit" });

export default async function Interviews({ searchParams }: { searchParams: Promise<{ a?: string; show?: string }> }) {
  const { supabase, isAdmin, roles } = await requireInterviewer();
  const sp = await searchParams;
  const { data } = await supabase.from("admissions")
    .select("*, profiles(full_name, phone, area, occupation_type, university, company, date_of_birth), interview_slots(starts_at, venues(name)), offerings(title)")
    .in("stage", ["interview_invited", "interviewed"]);
  const rows = (data ?? []) as unknown as Row[];
  const since = Date.now() - 12 * 3600_000;
  const showDone = sp.show === "done";
  const booked = rows.filter((r) => r.interview_slots && (showDone ? r.stage === "interviewed" : new Date(r.interview_slots.starts_at).getTime() > since))
    .sort((a, b) => (showDone ? -1 : 1) * (new Date(a.interview_slots!.starts_at).getTime() - new Date(b.interview_slots!.starts_at).getTime()) || Number(b.test_score ?? 0) - Number(a.test_score ?? 0));
  const unbooked = rows.filter((r) => !r.interview_slots && r.stage === "interview_invited").sort((a, b) => Number(b.test_score ?? 0) - Number(a.test_score ?? 0));
  const sel = rows.find((r) => r.id === sp.a);
  const [{ data: reg }, { data: fieldRows }] = sel
    ? await Promise.all([supabase.from("registrations").select("answers").eq("id", sel.registration_id).maybeSingle(), supabase.from("fields").select("key, label")])
    : [{ data: null }, { data: [] }];
  const labelOf = (k: string) => (fieldRows ?? []).find((f) => f.key === k)?.label ?? k.replace(/_/g, " ");
  const groups = new Map<string, Row[]>(); for (const r of booked) { const k = day(r.interview_slots!.starts_at); groups.set(k, [...(groups.get(k) ?? []), r]); }
  const link = (x: Record<string, string | undefined>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ show: sp.show, ...x })) if (v) p.set(k, v); return `/admin/interviews?${p}`; };

  return (
    <AdminShell isAdmin={isAdmin} roles={roles} current="/admin/interviews">
      <AdminHeader title="Interviews" sub="Applicants who booked an interview, in time order. Open one to see their test, essay and answers, then give a score out of 10." />
      <nav className="ad-filters">
        <Link href="/admin/interviews" className="ad-chip" aria-current={!showDone}>Upcoming</Link>
        <Link href="/admin/interviews?show=done" className="ad-chip" aria-current={showDone}>Done</Link>
      </nav>
      <div className="ad-grid">
        <div className="ad-form__col">
          {[...groups.entries()].map(([d, list]) => (
            <section key={d} className="ad-card" style={{ padding: 0 }}>
              <div className="ad-card__head" style={{ padding: "16px 20px 0" }}><h2>{d}</h2><span className="ad-muted">{list.length} interview{list.length > 1 ? "s" : ""}</span></div>
              <table className="ad-table">
                <thead><tr><th>Time</th><th>Applicant</th><th>Course</th><th>Test</th><th>Score</th></tr></thead>
                <tbody>{list.map((r) => (
                  <tr key={r.id} style={r.id === sp.a ? { background: "#EAF2FB" } : undefined}>
                    <td style={{ whiteSpace: "nowrap" }}><strong>{time(r.interview_slots!.starts_at)}</strong><div className="ad-muted">{r.interview_slots!.venues?.name}</div></td>
                    <td><Link href={link({ a: r.id })}>{r.profiles?.full_name}</Link><div className="ad-muted">{r.profiles?.phone}</div></td>
                    <td className="ad-muted">{r.offerings?.title}</td>
                    <td>{r.test_score != null ? <strong>{Number(r.test_score)}</strong> : "·"}{r.tab_switches > 0 && <div className="am-flag">⚠ left {r.tab_switches}×</div>}</td>
                    <td>{r.interview_score != null ? <span className="ad-pill ad-pill--confirmed">{Number(r.interview_score)}/10</span> : <span className="ad-muted">to do</span>}</td>
                  </tr>))}
                </tbody>
              </table>
            </section>
          ))}
          {!groups.size && <section className="ad-card"><p className="ad-muted" style={{ margin: 0 }}>{showDone ? "No interviews scored yet." : "No upcoming interviews booked yet."}</p></section>}
          {!showDone && unbooked.length > 0 && (
            <section className="ad-card">
              <h2>Invited, not booked yet ({unbooked.length})</h2>
              <div className="ad-list">{unbooked.map((r) => <Link key={r.id} href={link({ a: r.id })}><span>{r.profiles?.full_name}<span className="ad-muted"> · {r.offerings?.title}</span></span><span className="ad-muted">test {Number(r.test_score ?? 0)}</span></Link>)}</div>
            </section>
          )}
        </div>
        <aside className="ad-card ad-sticky" style={{ display: "block" }}>
          {sel ? (
            <div className="ad-detail">
              <div className="ad-card__head"><h2>{sel.profiles?.full_name}</h2><Link href={link({ a: undefined })} aria-label="Close" className="ad-muted">✕</Link></div>
              <div className="ad-muted">{[sel.offerings?.title, sel.profiles?.area, sel.profiles?.university ?? sel.profiles?.company].filter(Boolean).join(" · ")}</div>
              {sel.test_score != null && <div><dt>Admission test</dt><dd><strong style={{ fontSize: 22 }}>{Number(sel.test_score)}</strong><span className="ad-muted">/100</span></dd>
                {Object.entries(gameDetail(sel.test_detail)).map(([g, v]) => <div key={g} className="am-game"><span>{GAMES[g] ?? g}</span><div className="ad-bar"><span style={{ width: `${Math.round((100 * v.points) / Math.max(v.max, 1))}%` }} /></div><small>{v.correct}/{v.total}</small></div>)}
              </div>}
              {sel.essay && <div><dt>Why Hikmah</dt><dd>{sel.essay}</dd></div>}
              {reg?.answers && Object.keys(reg.answers as object).length > 0 && (
                <dl style={{ margin: 0, padding: 12, border: "1px solid var(--hk-border)", borderRadius: 12 }}>
                  {Object.entries(reg.answers as Record<string, unknown>).filter(([, v]) => v !== "" && v != null).map(([k, v]) => <div key={k}><dt>{labelOf(k)}</dt><dd>{Array.isArray(v) ? v.join(", ") : String(v)}</dd></div>)}
                </dl>
              )}
              <ScoreForm id={sel.id} score={sel.interview_score != null ? Number(sel.interview_score) : null} notes={sel.interview_notes} />
            </div>
          ) : <p className="ad-muted" style={{ margin: 0 }}>Click a name to open their file and record the interview score.</p>}
        </aside>
      </div>
    </AdminShell>
  );
}
