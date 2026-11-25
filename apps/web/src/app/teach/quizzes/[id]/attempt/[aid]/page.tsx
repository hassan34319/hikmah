import Link from "next/link";
import { notFound } from "next/navigation";
import { LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { requireTeacher } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";
import { AttemptMarkForm } from "../../../../Editors";

export const dynamic = "force-dynamic";

export default async function MarkAttempt({ params }: { params: Promise<{ id: string; aid: string }> }) {
  const { supabase, name, isAdmin } = await requireTeacher();
  const { id, aid } = await params;
  const [{ data: q }, { data: a }, { data: qs }, { data: rs }] = await Promise.all([
    supabase.from("lms_quizzes").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("lms_quiz_attempts").select("*, profiles(full_name, email)").eq("id", aid).eq("quiz_id", id).maybeSingle(),
    supabase.from("lms_quiz_questions").select("*, lms_quiz_keys(correct, model_answer)").eq("quiz_id", id).order("pos"),
    supabase.from("lms_quiz_responses").select("*").eq("attempt_id", aid),
  ]);
  if (!q || !a) notFound();
  const who = (a as unknown as { profiles: { full_name: string | null; email: string } | null }).profiles;
  const resp = new Map((rs ?? []).map((r) => [r.question_id, r]));
  type QQ = { id: string; kind: "mcq" | "short"; prompt: string; options: string[]; points: number; lms_quiz_keys: { correct: number | null; model_answer: string | null } | null };
  const list = (qs ?? []) as unknown as QQ[];
  return (
    <LmsShell mode="teach" current="/teach/quizzes" name={name} admin={isAdmin} other>
      <LmsHead title={who?.full_name ?? who?.email ?? "Student"} crumb={<><Link href="/teach/quizzes">Quizzes</Link> / <Link href={`/teach/quizzes/${id}?tab=results`}>{q.title}</Link></>}
        sub={<>Score {Number(a.score ?? 0)} / {Number(a.max_score ?? 0)}{a.needs_marking ? " so far" : ""} · submitted {a.submitted_at ? fmtDate(a.submitted_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "not yet"}</>} />
      <section className="ad-card">
        <AttemptMarkForm quizId={id} attemptId={aid} feedback={a.feedback}>
          <ol className="lm-qs">
            {list.map((x, i) => {
              const r = resp.get(x.id);
              const opts = Array.isArray(x.options) ? x.options : [];
              return (
                <li key={x.id} className="lm-q">
                  <div className="lm-q__head"><span className="lm-q__n">{i + 1}</span><span className="ad-muted">{x.kind === "mcq" ? "Multiple choice" : "Short answer"} · {Number(x.points)} pts</span></div>
                  <p className="lm-q__prompt" dir="auto">{x.prompt}</p>
                  {x.kind === "mcq" ? (
                    <ol className="lm-q__opts" type="a">
                      {opts.map((o, j) => <li key={j} className={[x.lms_quiz_keys?.correct === j ? "is-correct" : "", r?.choice === j ? "is-picked" : ""].join(" ")} dir="auto">{o}{r?.choice === j && <span className="lm-tick"> ← their answer</span>}</li>)}
                    </ol>
                  ) : (
                    <>
                      <div className="lm-answer" dir="auto">{r?.answer?.trim() ? r.answer : <span className="ad-muted">No answer</span>}</div>
                      {x.lms_quiz_keys?.model_answer && <p className="ad-muted" dir="auto">Model answer: {x.lms_quiz_keys.model_answer}</p>}
                    </>
                  )}
                  <label className="lm-points">Points
                    <input name={`pts_${x.id}`} type="number" min={0} max={Number(x.points)} step="0.5" className="ad-input" defaultValue={r?.points ?? ""} placeholder="?" />
                    <span>/ {Number(x.points)}</span>
                  </label>
                </li>
              );
            })}
          </ol>
        </AttemptMarkForm>
      </section>
    </LmsShell>
  );
}
