import Link from "next/link";
import { notFound } from "next/navigation";
import { LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { requireTeacher } from "@/lib/lms-server";
import { fmtDate, toPktInput } from "@/lib/time";
import { deleteQuestion, deleteQuiz, moveQuestion } from "../../actions";
import { PublishForm, QuestionCard, QuestionEditor, QuizSettings, type QuestionDraft } from "../../Editors";

export const dynamic = "force-dynamic";

export default async function QuizBuilder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { supabase, name, isAdmin, scopes } = await requireTeacher();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await supabase.rpc("lms_quiz_close_expired", { p_quiz: id });
  const [{ data: q }, { data: qs }, { data: attempts }] = await Promise.all([
    supabase.from("lms_quizzes").select("*, lms_subjects(name), lms_quiz_sections(section_id, lms_sections(name))").eq("id", id).maybeSingle(),
    supabase.from("lms_quiz_questions").select("*, lms_quiz_keys(correct, model_answer)").eq("quiz_id", id).order("pos"),
    supabase.from("lms_quiz_attempts").select("*, profiles(full_name, email)").eq("quiz_id", id).order("submitted_at", { ascending: false, nullsFirst: true }),
  ]);
  if (!q) notFound();
  type X = { lms_subjects: { name: string } | null; lms_quiz_sections: { section_id: string; lms_sections: { name: string } | null }[] };
  const qx = q as unknown as typeof q & X;
  type QQ = { id: string; kind: "mcq" | "short"; prompt: string; options: string[]; points: number; lms_quiz_keys: { correct: number | null; model_answer: string | null } | null };
  const questions: QuestionDraft[] = ((qs ?? []) as unknown as QQ[]).map((x) => ({ id: x.id, kind: x.kind, prompt: x.prompt, options: Array.isArray(x.options) ? x.options : [], correct: x.lms_quiz_keys?.correct ?? null, points: Number(x.points), model: x.lms_quiz_keys?.model_answer ?? "" }));
  const total = questions.reduce((a, b) => a + b.points, 0);
  type AT = { id: string; started_at: string; submitted_at: string | null; score: number | null; max_score: number | null; needs_marking: boolean; profiles: { full_name: string | null; email: string } | null };
  const att = (attempts ?? []) as unknown as AT[];
  const locked = att.length > 0;
  const tab = sp.tab === "results" || sp.tab === "settings" ? sp.tab : "questions";
  const scope = `${q.offering_id}|${q.subject_id}`;

  return (
    <LmsShell mode="teach" current="/teach/quizzes" name={name} admin={isAdmin} other>
      <LmsHead title={q.title} crumb={<Link href="/teach/quizzes">Quizzes</Link>}
        sub={<>{qx.lms_subjects?.name} · {qx.lms_quiz_sections.map((s) => s.lms_sections?.name).join(", ")} · {questions.length} questions, {total} points{q.time_limit_min ? ` · ${q.time_limit_min} min` : ""}{q.closes_at ? ` · closes ${fmtDate(q.closes_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}</>}
        actions={<span className={`ad-pill ad-pill--${q.published ? "confirmed" : "draft"}`}>{q.published ? "Published" : "Draft"}</span>} />
      <nav className="ad-tabs" aria-label="Quiz">
        <Link href={`/teach/quizzes/${id}`} aria-current={tab === "questions" ? "page" : undefined}>Questions ({questions.length})</Link>
        <Link href={`/teach/quizzes/${id}?tab=settings`} aria-current={tab === "settings" ? "page" : undefined}>Settings</Link>
        <Link href={`/teach/quizzes/${id}?tab=results`} aria-current={tab === "results" ? "page" : undefined}>Results ({att.filter((a) => a.submitted_at).length})</Link>
      </nav>

      {tab === "questions" && (
        <div className="ad-grid">
          <section className="ad-card">
            {locked && <div className="ad-alert" role="note">Students have started this quiz, so questions are locked to keep marks fair.</div>}
            {questions.length ? (
              <ol className="lm-qs">
                {questions.map((x, i) => (
                  <QuestionCard key={x.id} quizId={id} n={i + 1} q={x} locked={locked}>
                    {!locked && <>
                      {i > 0 && <form action={moveQuestion}><input type="hidden" name="quiz_id" value={id} /><input type="hidden" name="question_id" value={x.id} /><input type="hidden" name="dir" value="up" /><button className="ad-icon-btn" aria-label="Move up">↑</button></form>}
                      {i < questions.length - 1 && <form action={moveQuestion}><input type="hidden" name="quiz_id" value={id} /><input type="hidden" name="question_id" value={x.id} /><input type="hidden" name="dir" value="down" /><button className="ad-icon-btn" aria-label="Move down">↓</button></form>}
                      <form action={deleteQuestion}><input type="hidden" name="quiz_id" value={id} /><input type="hidden" name="question_id" value={x.id} /><button className="ad-icon-btn ad-icon-btn--danger">Delete</button></form>
                    </>}
                  </QuestionCard>
                ))}
              </ol>
            ) : <p className="ad-muted">No questions yet. Add the first one on the right.</p>}
          </section>
          <aside className="ad-form__col">
            {!locked && <section className="ad-card"><h2>Add a question</h2><QuestionEditor quizId={id} draft={{ kind: "mcq", prompt: "", options: [], correct: null, points: 1, model: "" }} /></section>}
            <section className="ad-card"><h2>{q.published ? "Published" : "Ready?"}</h2>
              <p className="ad-muted">{q.published ? "Students in the chosen sections can see and take this quiz." : "Students only see the quiz once you publish it."}</p>
              <PublishForm quizId={id} published={q.published} questions={questions.length} />
            </section>
          </aside>
        </div>
      )}

      {tab === "settings" && (
        <div className="ad-grid">
          <section className="ad-card lm-editor">
            <QuizSettings scopes={scopes} draft={{ id, scope, sections: qx.lms_quiz_sections.map((s) => s.section_id), title: q.title, instructions: q.instructions ?? "", opens: toPktInput(q.opens_at), closes: toPktInput(q.closes_at), limit: q.time_limit_min ? String(q.time_limit_min) : "", shuffle: q.shuffle, showAnswers: q.show_answers }} />
          </section>
          <aside className="ad-form__col">
            <section className="ad-card"><h2>Delete quiz</h2><p className="ad-muted">Removes the quiz and every student’s answers. This can’t be undone.</p>
              <form action={deleteQuiz}><input type="hidden" name="quiz_id" value={id} /><button className="ad-icon-btn ad-icon-btn--danger">Delete this quiz</button></form>
            </section>
          </aside>
        </div>
      )}

      {tab === "results" && (
        <section className="ad-card" style={{ padding: 0 }}>
          {att.length ? (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Student</th><th>Status</th><th>Score</th><th /></tr></thead>
                <tbody>
                  {att.map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.profiles?.full_name ?? a.profiles?.email}</strong><div className="ad-muted">{a.profiles?.email}</div></td>
                      <td>{a.submitted_at ? (a.needs_marking ? <span className="ad-pill ad-pill--waitlisted">To mark</span> : <span className="ad-pill ad-pill--confirmed">Marked</span>) : <span className="ad-pill ad-pill--draft">In progress</span>}
                        <div className="ad-muted">{a.submitted_at ? fmtDate(a.submitted_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : `started ${fmtDate(a.started_at, { hour: "numeric", minute: "2-digit" })}`}</div></td>
                      <td>{a.submitted_at ? <strong>{Number(a.score ?? 0)} / {Number(a.max_score ?? total)}</strong> : ""}{a.submitted_at && a.needs_marking && <div className="ad-muted">so far</div>}</td>
                      <td style={{ textAlign: "right" }}>{a.submitted_at && <Link href={`/teach/quizzes/${id}/attempt/${a.id}`} className="ad-icon-btn">{a.needs_marking ? "Mark" : "View"}</Link>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="ad-muted" style={{ padding: "14px 18px", margin: 0 }}>Nobody has taken this quiz yet.</p>}
        </section>
      )}
    </LmsShell>
  );
}
