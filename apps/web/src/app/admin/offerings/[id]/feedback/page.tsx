import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { DEFAULT_FEEDBACK, parseQuestions } from "@/lib/feedback";
import { fmtDate } from "@/lib/time";
import { OfferingTabs } from "../tabs";
import { toggleFeedbackOpen } from "./actions";
import { QuestionEditor, SendPanel } from "./FeedbackAdmin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Feedback" };

export default async function FeedbackAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const [{ data: offering }, { data: form }, { data: regs }, { data: responses }] = await Promise.all([
    supabase.from("offerings").select("id, title, starts_at, offering_types(kind)").eq("id", id).maybeSingle(),
    supabase.from("feedback_forms").select("*").eq("offering_id", id).maybeSingle(),
    supabase.from("registrations").select("id").eq("offering_id", id).neq("status", "cancelled"),
    supabase.from("feedback_responses").select("id, answers, anonymous, created_at, registration_id, registrations(profiles(full_name))").eq("offering_id", id).order("created_at", { ascending: false }),
  ]);
  if (!offering) notFound();
  const kind = (offering as unknown as { offering_types: { kind: "course" | "event" } | null }).offering_types?.kind ?? "event";
  const questions = form ? parseQuestions(form.questions) : DEFAULT_FEEDBACK;
  type Resp = { id: string; answers: Record<string, unknown>; anonymous: boolean; created_at: string; registrations: { profiles: { full_name: string | null } | null } | null };
  const rs = (responses ?? []) as unknown as Resp[];
  const total = regs?.length ?? 0;
  const answeredIds = new Set((responses ?? []).map((r) => r.registration_id));
  const missing = (regs ?? []).filter((r) => !answeredIds.has(r.id)).length;

  return (
    <AdminShell isAdmin current="/admin/offerings">
      <AdminHeader title={offering.title} crumb={<><Link href="/admin/offerings">Courses and events</Link> / Feedback</>}
        actions={rs.length > 0 ? <a href={`/admin/offerings/${id}/feedback/export`} className="hk-btn hk-btn--ghost hk-btn--sm">Export answers (CSV)</a> : undefined} />
      <OfferingTabs id={id} current="feedback" kind={kind} />

      <div className="ad-stats">
        <div className="ad-stat"><span>Responses</span><strong>{rs.length}</strong><small>of {total} registered</small></div>
        <div className="ad-stat"><span>Response rate</span><strong>{total ? Math.round((rs.length / total) * 100) : 0}%</strong><small>{form?.sent_at ? `last sent ${fmtDate(form.sent_at)}` : "not sent yet"}</small></div>
        {questions.filter((q) => q.type === "rating").slice(0, 2).map((q) => {
          const vals = rs.map((r) => Number(r.answers[q.key])).filter((n) => n >= 1);
          return <div key={q.key} className="ad-stat"><span>{q.label}</span><strong>{vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "–"}<small style={{ fontSize: 16 }}> / 5</small></strong><small>{vals.length} ratings</small></div>;
        })}
      </div>

      <div className="ad-grid">
        <div style={{ display: "grid", gap: 20 }}>
          <section className="ad-card">
            <h2>Results</h2>
            {rs.length === 0 && <p className="ad-muted" style={{ margin: 0 }}>No answers yet. Send the form, then results appear here as people respond.</p>}
            {rs.length > 0 && (
              <div style={{ display: "grid", gap: 22 }}>
                {questions.map((q) => {
                  const ans = rs.map((r) => r.answers[q.key]).filter((v) => v !== undefined && v !== "");
                  if (q.type === "rating") {
                    const nums = ans.map(Number);
                    return (
                      <div key={q.key}>
                        <strong>{q.label}</strong>
                        <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                          <span className="fb-avg">{nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : "–"}</span>
                          <div className="fb-dist" style={{ flex: 1, minWidth: 220 }}>
                            {[5, 4, 3, 2, 1].map((n) => {
                              const c = nums.filter((x) => x === n).length;
                              return <div key={n}><span>{n}★</span><div className="ad-bar"><span style={{ width: `${nums.length ? (c / nums.length) * 100 : 0}%` }} /></div><span>{c}</span></div>;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (q.type === "single" || q.type === "multi") {
                    const flat = ans.flatMap((v) => (Array.isArray(v) ? v : [v])).map(String);
                    return (
                      <div key={q.key}>
                        <strong>{q.label}</strong>
                        <div className="fb-dist" style={{ marginTop: 8 }}>
                          {(q.options ?? []).map((o) => {
                            const c = flat.filter((x) => x === o).length;
                            return <div key={o} style={{ gridTemplateColumns: "minmax(120px, 200px) 1fr 32px" }}><span style={{ color: "var(--hk-ink)" }}>{o}</span><div className="ad-bar"><span style={{ width: `${rs.length ? (c / rs.length) * 100 : 0}%`, background: "var(--hk-accent)" }} /></div><span>{c}</span></div>;
                          })}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={q.key}>
                      <strong>{q.label}</strong> <span className="ad-muted">({ans.length})</span>
                      <div className="ad-list" style={{ marginTop: 6 }}>
                        {rs.filter((r) => r.answers[q.key]).slice(0, 50).map((r) => (
                          <div key={r.id} style={{ display: "block" }}>
                            <span style={{ whiteSpace: "pre-wrap" }}>{String(r.answers[q.key])}</span>
                            <div className="ad-muted">{r.anonymous ? "Anonymous" : r.registrations?.profiles?.full_name ?? "Someone"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <section className="ad-card">
            <h2>Questions</h2>
            <QuestionEditor offeringId={id} initial={questions} intro={form?.intro ?? ""} />
          </section>
        </div>

        <div className="ad-sticky">
          <section className="ad-card">
            <h2>Send the feedback form</h2>
            <p className="ad-muted" style={{ marginTop: -6 }}>Each person gets an email with their own link. No sign-in needed. They can submit anonymously.</p>
            <SendPanel offeringId={id} total={total} missing={missing} sentAt={form?.sent_at ?? null} />
          </section>
          {form && (
            <section className="ad-card">
              <h2>Accepting answers</h2>
              <form action={toggleFeedbackOpen} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <input type="hidden" name="offering_id" value={id} /><input type="hidden" name="open" value={form.is_open ? "0" : "1"} />
                <span className={`ad-pill ${form.is_open ? "ad-pill--confirmed" : "ad-pill--closed"}`}>{form.is_open ? "Open" : "Closed"}</span>
                <button className="hk-btn hk-btn--ghost hk-btn--sm">{form.is_open ? "Close the form" : "Reopen"}</button>
              </form>
            </section>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
