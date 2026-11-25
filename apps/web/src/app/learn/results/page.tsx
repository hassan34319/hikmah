import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { requireStudent } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LearnResults() {
  const { supabase, userId, name, enrolments, isTeacher } = await requireStudent();
  const [{ data: subs }, { data: att }] = enrolments.length ? await Promise.all([
    supabase.from("lms_submissions").select("marks, feedback, marked_at, submitted_at, lms_assignments(id, title, max_marks, due_at, lms_subjects(name))").eq("user_id", userId).not("marked_at", "is", null),
    supabase.from("lms_quiz_attempts").select("score, max_score, needs_marking, submitted_at, lms_quizzes(id, title, lms_subjects(name))").eq("user_id", userId).not("submitted_at", "is", null),
  ]) : [{ data: [] }, { data: [] }];
  type S = { marks: number; feedback: string | null; marked_at: string; lms_assignments: { id: string; title: string; max_marks: number; lms_subjects: { name: string } | null } | null };
  type Q = { score: number | null; max_score: number | null; needs_marking: boolean; submitted_at: string; lms_quizzes: { id: string; title: string; lms_subjects: { name: string } | null } | null };
  const rows = [
    ...((subs ?? []) as unknown as S[]).map((s) => ({ key: `a${s.lms_assignments?.id}`, href: `/learn/assignments/${s.lms_assignments?.id}`, kind: "Assignment", title: s.lms_assignments?.title ?? "", subject: s.lms_assignments?.lms_subjects?.name ?? "", got: Number(s.marks), of: Number(s.lms_assignments?.max_marks ?? 0), when: s.marked_at, pending: false })),
    ...((att ?? []) as unknown as Q[]).map((a) => ({ key: `q${a.lms_quizzes?.id}`, href: `/learn/quizzes/${a.lms_quizzes?.id}`, kind: "Quiz", title: a.lms_quizzes?.title ?? "", subject: a.lms_quizzes?.lms_subjects?.name ?? "", got: Number(a.score ?? 0), of: Number(a.max_score ?? 0), when: a.submitted_at, pending: a.needs_marking })),
  ].sort((x, y) => y.when.localeCompare(x.when));
  const subjects = [...new Set(rows.map((r) => r.subject))].sort();
  const avg = (list: typeof rows) => { const done = list.filter((r) => !r.pending && r.of > 0); return done.length ? Math.round((done.reduce((s, r) => s + r.got / r.of, 0) / done.length) * 100) : null; };
  return (
    <LmsShell mode="learn" current="/learn/results" name={name} other={isTeacher}>
      <LmsHead title="Results" sub="Marks from your assignments and quizzes. Attendance and exam results will appear here once they're connected." />
      {rows.length ? <>
        <div className="lm-stats">
          {subjects.map((s) => { const a = avg(rows.filter((r) => r.subject === s)); return <div key={s}><strong>{a === null ? "–" : `${a}%`}</strong><span>{s}</span></div>; })}
        </div>
        <section className="ad-card" style={{ padding: 0 }}>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Work</th><th>Subject</th><th>Score</th><th>Date</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td><Link href={r.href}><strong>{r.title}</strong></Link><div className="ad-muted">{r.kind}</div></td>
                    <td>{r.subject}</td>
                    <td><strong>{r.got}</strong> / {r.of}{r.pending && <div className="ad-muted">more to be marked</div>}</td>
                    <td className="ad-muted">{fmtDate(r.when, { day: "numeric", month: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </> : <Empty title="No marks yet">Once your teachers mark your assignments or quizzes, your scores appear here.</Empty>}
    </LmsShell>
  );
}
