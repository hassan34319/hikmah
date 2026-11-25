import Link from "next/link";
import { notFound } from "next/navigation";
import { LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { errText } from "@/lib/lms";
import { requireStudent } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";
import { startQuiz } from "../../actions";
import { QuizPlayer, type PlayQuestion } from "../../Student";

export const dynamic = "force-dynamic";

/** Same order every time for the same student, different between students. */
function seededShuffle<T>(list: T[], seed: string) {
  let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [out[i], out[j]] = [out[j]!, out[i]!]; }
  return out;
}

export default async function LearnQuiz({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string; done?: string }> }) {
  const { supabase, userId, name, isTeacher } = await requireStudent();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { data: q } = await supabase.from("lms_quizzes").select("*, lms_subjects(name)").eq("id", id).maybeSingle();
  if (!q) notFound();
  const subject = (q as unknown as { lms_subjects: { name: string } | null }).lms_subjects?.name;
  let { data: att } = await supabase.from("lms_quiz_attempts").select("*").eq("quiz_id", id).eq("user_id", userId).maybeSingle();
  if (att && !att.submitted_at && att.deadline && new Date(att.deadline).getTime() + 30_000 < Date.now()) {
    await supabase.rpc("lms_quiz_submit", { p_attempt: att.id });
    ({ data: att } = await supabase.from("lms_quiz_attempts").select("*").eq("quiz_id", id).eq("user_id", userId).maybeSingle());
  }
  const { data: qs } = await supabase.from("lms_quiz_questions").select("id, kind, prompt, options, points").eq("quiz_id", id).order("pos");
  const questions: PlayQuestion[] = (qs ?? []).map((x) => ({ id: x.id, kind: x.kind, prompt: x.prompt, options: Array.isArray(x.options) ? (x.options as string[]) : [], points: Number(x.points) }));
  const { data: sum } = await supabase.rpc("lms_quiz_summary", { p_quizzes: [id] });
  const total = sum?.[0] ? Number(sum[0].points) : questions.reduce((s, x) => s + x.points, 0);
  const qCount = sum?.[0]?.questions ?? questions.length;
  const open = (!q.opens_at || new Date(q.opens_at) <= new Date()) && (!q.closes_at || new Date(q.closes_at) > new Date());
  const crumb = <Link href="/learn/quizzes">Quizzes</Link>;

  // Taking it now
  if (att && !att.submitted_at) {
    const { data: rs } = await supabase.from("lms_quiz_responses").select("question_id, choice, answer").eq("attempt_id", att.id);
    const saved = Object.fromEntries((rs ?? []).map((r) => [r.question_id, { choice: r.choice, answer: r.answer ?? "" }]));
    return (
      <LmsShell mode="learn" current="/learn/quizzes" name={name} other={isTeacher}>
        <QuizPlayer quizId={id} attemptId={att.id} title={q.title} deadline={att.deadline} saved={saved} questions={q.shuffle ? seededShuffle(questions, att.id) : questions} />
      </LmsShell>
    );
  }

  // Finished: score and, when allowed, the answers
  if (att?.submitted_at) {
    const [{ data: rs }, { data: keys }] = await Promise.all([
      supabase.from("lms_quiz_responses").select("question_id, choice, answer, points").eq("attempt_id", att.id),
      supabase.rpc("lms_quiz_review", { p_attempt: att.id }),
    ]);
    const resp = new Map((rs ?? []).map((r) => [r.question_id, r]));
    const key = new Map((keys ?? []).map((k) => [k.question_id, k]));
    const reveal = key.size > 0;
    return (
      <LmsShell mode="learn" current="/learn/quizzes" name={name} other={isTeacher}>
        <LmsHead title={q.title} crumb={crumb} sub={`${subject} · handed in ${fmtDate(att.submitted_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`} />
        {sp.done && <div className="ad-alert ad-alert--ok" role="status">Handed in. JazakAllah khair!</div>}
        <section className="ad-card lm-result">
          <div className="lm-result__score"><strong>{Number(att.score ?? 0)}</strong><span>/ {Number(att.max_score ?? total)}</span></div>
          <p className="ad-muted">{att.needs_marking ? "Your teacher still has to mark the written answers, so this score may go up." : "Final score."}</p>
          {att.feedback && <p className="lm-feedback" dir="auto">{att.feedback}</p>}
        </section>
        <section className="ad-card">
          <h2>Your answers</h2>
          {!reveal && <p className="ad-muted">{q.show_answers ? "Correct answers appear here once the quiz closes." : "Your teacher has chosen not to show the correct answers."}</p>}
          <ol className="lm-qs">
            {questions.map((x, i) => {
              const r = resp.get(x.id); const k = key.get(x.id);
              return (
                <li key={x.id} className="lm-q">
                  <div className="lm-q__head"><span className="lm-q__n">{i + 1}</span><span className="ad-muted">{r?.points != null ? `${Number(r.points)} / ${x.points}` : `${x.points} pts, not marked yet`}</span></div>
                  <p className="lm-q__prompt" dir="auto">{x.prompt}</p>
                  {x.kind === "mcq" ? (
                    <ol className="lm-q__opts" type="a">
                      {x.options.map((o, j) => <li key={j} className={[reveal && k?.correct === j ? "is-correct" : "", r?.choice === j ? "is-picked" : ""].join(" ")} dir="auto">{o}{r?.choice === j && <span className="lm-tick"> ← your answer</span>}</li>)}
                    </ol>
                  ) : (
                    <>
                      <div className="lm-answer" dir="auto">{r?.answer?.trim() ? r.answer : <span className="ad-muted">No answer</span>}</div>
                      {reveal && k?.model_answer && <p className="ad-muted" dir="auto">Model answer: {k.model_answer}</p>}
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </LmsShell>
    );
  }

  // Not started
  return (
    <LmsShell mode="learn" current="/learn/quizzes" name={name} other={isTeacher}>
      <LmsHead title={q.title} crumb={crumb} sub={subject} />
      <section className="ad-card lm-start">
        <dl className="lm-facts">
          <div><dt>Questions</dt><dd>{qCount}</dd></div>
          <div><dt>Points</dt><dd>{total}</dd></div>
          <div><dt>Time</dt><dd>{q.time_limit_min ? `${q.time_limit_min} min` : "No limit"}</dd></div>
          {q.closes_at && <div><dt>Closes</dt><dd>{fmtDate(q.closes_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</dd></div>}
        </dl>
        {q.instructions && <p className="lm-post__body" dir="auto">{q.instructions}</p>}
        <ul className="lm-rules">
          <li>You get one attempt. Your answers save as you go.</li>
          {q.time_limit_min ? <li>The timer starts when you press Start and keeps running if you leave the page.</li> : null}
          <li>Please do it on your own, without notes or AI tools, unless your teacher says otherwise.</li>
        </ul>
        {sp.e && <div className="ad-alert ad-alert--err" role="alert">{errText(sp.e)}</div>}
        {open ? (
          <form action={startQuiz}><input type="hidden" name="quiz_id" value={id} /><button className="hk-btn hk-btn--primary">Start quiz</button></form>
        ) : <p className="ad-muted">{q.opens_at && new Date(q.opens_at) > new Date() ? `This quiz opens ${fmtDate(q.opens_at, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}.` : "This quiz has closed."}</p>}
      </section>
    </LmsShell>
  );
}
