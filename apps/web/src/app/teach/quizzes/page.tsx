import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { requireTeacher } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TeachQuizzes() {
  const { supabase, name, isAdmin, scopes } = await requireTeacher();
  const offerings = [...new Set(scopes.map((s) => s.offeringId))];
  const { data } = offerings.length ? await supabase.from("lms_quizzes").select("id, title, published, opens_at, closes_at, time_limit_min, offering_id, subject_id, lms_subjects(name), lms_quiz_sections(lms_sections(name)), lms_quiz_questions(id), lms_quiz_attempts(id, submitted_at, needs_marking)").in("offering_id", offerings).order("created_at", { ascending: false }) : { data: [] };
  type Q = { id: string; title: string; published: boolean; opens_at: string | null; closes_at: string | null; time_limit_min: number | null; offering_id: string; subject_id: string | null; lms_subjects: { name: string } | null; lms_quiz_sections: { lms_sections: { name: string } | null }[]; lms_quiz_questions: { id: string }[]; lms_quiz_attempts: { id: string; submitted_at: string | null; needs_marking: boolean }[] };
  const list = ((data ?? []) as unknown as Q[]).filter((q) => isAdmin || scopes.some((s) => s.offeringId === q.offering_id && s.subjectId === q.subject_id));
  const status = (q: Q) => !q.published ? ["Draft", "draft"] : q.closes_at && new Date(q.closes_at) < new Date() ? ["Closed", "cancelled"] : q.opens_at && new Date(q.opens_at) > new Date() ? ["Scheduled", "waitlisted"] : ["Open", "confirmed"];
  return (
    <LmsShell mode="teach" current="/teach/quizzes" name={name} admin={isAdmin} other>
      <LmsHead title="Quizzes" sub="Multiple-choice questions are marked automatically. Short answers wait for you." actions={<Link href="/teach/quizzes/new" className="hk-btn hk-btn--primary hk-btn--sm">New quiz</Link>} />
      {list.length ? (
        <section className="ad-card" style={{ padding: 0 }}>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Quiz</th><th>Status</th><th>Sections</th><th>Questions</th><th>Done</th><th>To mark</th></tr></thead>
              <tbody>
                {list.map((q) => {
                  const [label, pill] = status(q);
                  const done = q.lms_quiz_attempts.filter((a) => a.submitted_at).length;
                  const open = q.lms_quiz_attempts.filter((a) => a.submitted_at && a.needs_marking).length;
                  return (
                    <tr key={q.id}>
                      <td><Link href={`/teach/quizzes/${q.id}`}><strong>{q.title}</strong></Link><div className="ad-muted">{q.lms_subjects?.name}{q.time_limit_min ? ` · ${q.time_limit_min} min` : ""}{q.closes_at ? ` · closes ${fmtDate(q.closes_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}</div></td>
                      <td><span className={`ad-pill ad-pill--${pill}`}>{label}</span></td>
                      <td>{q.lms_quiz_sections.map((x) => x.lms_sections?.name).filter(Boolean).join(", ")}</td>
                      <td>{q.lms_quiz_questions.length}</td>
                      <td><Link href={`/teach/quizzes/${q.id}?tab=results`}>{done}</Link></td>
                      <td>{open ? <span className="lm-badge">{open}</span> : <span className="ad-muted">none</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : <Empty title="No quizzes yet">Create one with “New quiz”, add questions, then publish it to your sections.</Empty>}
    </LmsShell>
  );
}
