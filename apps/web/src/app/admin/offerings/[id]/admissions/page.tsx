import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { AdmissionRow, AdmissionStage } from "@hikmah/db";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { GAMES, STAGES, STAGE_LABEL, STAGE_PILL, combined, gameDetail } from "@/lib/admissions";
import { fmtDate } from "@/lib/time";
import { OfferingTabs } from "../tabs";
import { answerText } from "../responses/data";
import { deleteSlot, saveAdmissionNote } from "./actions";
import { Board, type BoardRow } from "./Board";
import { SettingsForm, SlotForm } from "./Settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admissions" };

type Row = AdmissionRow & {
  profiles: { full_name: string | null; email: string; phone: string | null; area: string | null; occupation_type: string | null } | null;
  interview_slots: { starts_at: string; venues: { name: string } | null } | null;
  registrations: { answers: Record<string, unknown>; submitted_at: string } | null;
};

export default async function Admissions({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ stage?: string; a?: string }> }) {
  const { supabase } = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [{ data: offering }, { data: adm }, { data: details }, { data: slots }, { data: venues }, { data: questions }] = await Promise.all([
    supabase.from("offerings").select("id, title, offering_types(kind)").eq("id", id).maybeSingle(),
    supabase.from("admissions").select("*, profiles(full_name, email, phone, area, occupation_type), interview_slots(starts_at, venues(name)), registrations(answers, submitted_at)").eq("offering_id", id),
    supabase.from("course_details").select("intake_year, essay_prompt, code").eq("offering_id", id).maybeSingle(),
    supabase.from("interview_slots").select("id, starts_at, minutes, capacity, venues(name)").eq("offering_id", id).gte("starts_at", new Date(Date.now() - 86_400_000).toISOString()).order("starts_at"),
    supabase.from("venues").select("id, name").order("name"),
    supabase.from("form_fields").select("position, fields(key, label, profile_column)").eq("offering_id", id).order("position"),
  ]);
  if (!offering) notFound();
  const all = (adm ?? []) as unknown as Row[];
  const stage = (STAGES.some((s) => s.key === sp.stage) ? sp.stage : "all") as AdmissionStage | "all";
  const count = (s: AdmissionStage) => all.filter((r) => r.stage === s).length;
  const visible = all.filter((r) => stage === "all" || r.stage === stage)
    .sort((a, b) => (combined(b.test_score, b.interview_score) ?? -1) - (combined(a.test_score, a.interview_score) ?? -1) || (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? ""));
  const href = (x: Record<string, string | undefined>) => {
    const p = new URLSearchParams(); for (const [k, v] of Object.entries({ stage: stage === "all" ? undefined : stage, ...x })) if (v) p.set(k, v);
    const q = p.toString(); return `/admin/offerings/${id}/admissions${q ? `?${q}` : ""}`;
  };
  const sel = all.find((r) => r.id === sp.a);
  const booked = new Map<string, number>(); for (const r of all) if (r.slot_id) booked.set(r.slot_id, (booked.get(r.slot_id) ?? 0) + 1);
  type Q = { fields: { key: string; label: string; profile_column: string | null } | null };
  const custom = ((questions ?? []) as unknown as Q[]).flatMap((q) => (q.fields && !q.fields.profile_column ? [q.fields] : []));

  const rows: BoardRow[] = visible.map((r) => ({
    id: r.id, name: r.profiles?.full_name ?? r.profiles?.email ?? "", phone: r.profiles?.phone ?? null,
    stage: r.stage, stageLabel: STAGE_LABEL[r.stage], pill: STAGE_PILL[r.stage],
    test: r.test_score != null ? Number(r.test_score) : null,
    flags: [r.tab_switches > 0 ? `left the test ${r.tab_switches}×` : "", r.test_submitted_at && !r.pledge ? "no pledge" : ""].filter(Boolean),
    slot: r.interview_slots ? fmtDate(r.interview_slots.starts_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : r.stage === "interview_invited" ? "not booked" : null,
    interview: r.interview_score != null ? Number(r.interview_score) : null,
    combined: combined(r.test_score, r.interview_score), studentId: r.student_id, sent: !!r.decision_sent_at, href: href({ a: r.id }),
  }));
  const pendingDecisions = all.filter((r) => ["selected", "waitlisted", "not_selected"].includes(r.stage) && !r.decision_sent_at).length;
  const done = all.filter((r) => r.test_submitted_at).length;

  return (
    <AdminShell isAdmin current="/admin/offerings">
      <AdminHeader title={offering.title} crumb={<><Link href="/admin/offerings">Courses and events</Link> / Admissions</>}
        sub="Shortlist applicants for the admission test, invite the best to interview, then decide. Applicants are emailed at each step." />
      <OfferingTabs id={id} current="admissions" kind="course" />

      <div className="ad-stats">
        <div className="ad-stat"><span>Applications</span><strong>{all.length}</strong><small>{count("applied")} waiting for a test</small></div>
        <div className="ad-stat"><span>Tests finished</span><strong>{done}</strong><small>{count("test_invited")} still to take it</small></div>
        <div className="ad-stat"><span>Interviews</span><strong>{count("interview_invited") + count("interviewed")}</strong><small>{count("interviewed")} done</small></div>
        <div className="ad-stat"><span>Selected</span><strong>{count("selected")}</strong><small>{count("waitlisted")} waitlisted</small></div>
      </div>

      <nav className="ad-filters">
        <Link href={href({ stage: undefined, a: undefined })} className="ad-chip" aria-current={stage === "all"}>All ({all.length})</Link>
        {STAGES.map((s) => <Link key={s.key} href={`/admin/offerings/${id}/admissions?stage=${s.key}`} className="ad-chip" aria-current={stage === s.key}>{s.short} ({count(s.key)})</Link>)}
      </nav>

      <div className="ad-grid">
        <Board offeringId={id} rows={rows} pendingDecisions={pendingDecisions} campuses={(venues ?? []).map((v) => v.name)} />

        <aside className="ad-form__col">
          {sel ? (
            <section className="ad-card ad-detail">
              <div className="ad-card__head"><h2>{sel.profiles?.full_name}</h2><Link href={href({ a: undefined })} aria-label="Close" className="ad-muted">✕</Link></div>
              <div style={{ fontSize: 14 }}>{sel.profiles?.email}<br />{sel.profiles?.phone}<div className="ad-muted">{STAGE_LABEL[sel.stage]}{sel.student_id ? ` · ${sel.student_id}` : ""}</div></div>
              {sel.test_submitted_at ? (
                <div>
                  <dt>Admission test</dt>
                  <dd><strong style={{ fontSize: 22 }}>{Number(sel.test_score)}</strong><span className="ad-muted">/100 · {fmtDate(sel.test_submitted_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></dd>
                  {Object.entries(gameDetail(sel.test_detail)).map(([g, v]) => (
                    <div key={g} className="am-game"><span>{GAMES[g] ?? g}</span><div className="ad-bar"><span style={{ width: `${Math.round((100 * v.points) / Math.max(v.max, 1))}%` }} /></div><small>{v.correct}/{v.total}</small></div>
                  ))}
                  {sel.tab_switches > 0 && <div className="am-flag" style={{ marginTop: 6 }}>⚠ Left the test window {sel.tab_switches} time{sel.tab_switches > 1 ? "s" : ""}</div>}
                </div>
              ) : <p className="ad-muted" style={{ margin: 0 }}>{sel.stage === "test_invited" ? `Test sent ${sel.test_invited_at ? fmtDate(sel.test_invited_at, { day: "numeric", month: "short" }) : ""}, not taken yet.` : "Has not taken the admission test."}</p>}
              {sel.essay && <div><dt>Why Hikmah {sel.pledge ? <span className="ad-tag">no-AI pledge ✓</span> : null}</dt><dd>{sel.essay}</dd></div>}
              {(sel.interview_slots || sel.interview_score != null) && (
                <div><dt>Interview</dt><dd>{sel.interview_slots ? `${fmtDate(sel.interview_slots.starts_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}${sel.interview_slots.venues ? `, ${sel.interview_slots.venues.name}` : ""}` : ""}
                  {sel.interview_score != null && <><br /><strong>{Number(sel.interview_score)}/10</strong>{sel.interview_notes ? `: ${sel.interview_notes}` : ""}</>}</dd></div>
              )}
              {custom.length > 0 && <dl style={{ margin: 0, padding: 12, border: "1px solid var(--hk-border)", borderRadius: 12 }}>
                {custom.map((q) => <div key={q.key}><dt>{q.label}</dt><dd>{answerText(sel.registrations?.answers?.[q.key]) || <span className="ad-muted">No answer</span>}</dd></div>)}
              </dl>}
              <form action={saveAdmissionNote} className="ad-fields">
                <input type="hidden" name="id" value={sel.id} /><input type="hidden" name="offering_id" value={id} />
                <label className="ad-label">Admin note <small>only admins see this</small><textarea name="admin_notes" rows={2} className="ad-input" defaultValue={sel.admin_notes ?? ""} /></label>
                <button className="hk-btn hk-btn--ghost hk-btn--sm" style={{ justifySelf: "start" }}>Save note</button>
              </form>
            </section>
          ) : (
            <>
              <section className="ad-card">
                <h2>Interview slots</h2>
                <div className="ad-list" style={{ marginBottom: 14 }}>
                  {(slots ?? []).map((s) => (
                    <div key={s.id}>
                      <span>{fmtDate(s.starts_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}<br /><span className="ad-muted">{(s.venues as unknown as { name: string } | null)?.name ?? ""} · {booked.get(s.id) ?? 0}/{s.capacity} booked</span></span>
                      {!(booked.get(s.id)) && <form action={deleteSlot}><input type="hidden" name="slot_id" value={s.id} /><input type="hidden" name="offering_id" value={id} /><button className="ad-icon-btn ad-icon-btn--danger" aria-label="Delete slot">✕</button></form>}
                    </div>
                  ))}
                  {!(slots ?? []).length && <p className="ad-muted" style={{ margin: 0 }}>No slots yet. Add some before inviting people to interview.</p>}
                </div>
                <SlotForm offeringId={id} venues={venues ?? []} />
              </section>
              <section className="ad-card"><h2>Settings</h2><SettingsForm offeringId={id} intakeYear={details?.intake_year ?? null} prompt={details?.essay_prompt ?? ""} /></section>
            </>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
