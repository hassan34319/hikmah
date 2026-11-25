"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { LmsFile } from "@hikmah/db";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import { FileDrop } from "@/components/lms/FileDrop";
import { saveAnswer, submitAssignment, submitQuiz, type LearnState } from "./actions";

export function SubmitForm({ assignmentId, body, files, canSubmit, closedNote, resubmit }: { assignmentId: string; body: string; files: LmsFile[]; canSubmit: boolean; closedNote?: string; resubmit: boolean }) {
  const [s, act, pending] = useActionState<LearnState, FormData>(submitAssignment, {});
  if (!canSubmit) return <p className="ad-muted" style={{ margin: 0 }}>{closedNote}</p>;
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-fields">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <label className="ad-label">Your answer <small>type here, attach files, or both</small>
        <textarea name="body" className="ad-input" rows={6} defaultValue={body} dir="auto" placeholder="Write your answer…" />
      </label>
      <FileDrop target={{ kind: "submission", assignmentId }} initial={files} label="Your files" hint="Photos of handwritten work are fine. Up to 50 MB each." />
      {s.message && <div className={`ad-alert ${s.ok ? "ad-alert--ok" : "ad-alert--err"}`} role="status">{s.message}</div>}
      <button className="hk-btn hk-btn--primary" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Handing in…" : resubmit ? "Update my work" : "Hand in"}</button>
    </form>
  );
}

export type PlayQuestion = { id: string; kind: "mcq" | "short"; prompt: string; options: string[]; points: number };
type Answer = { choice: number | null; answer: string };

export function QuizPlayer({ quizId, attemptId, questions, saved, deadline, title }: {
  quizId: string; attemptId: string; questions: PlayQuestion[]; saved: Record<string, Answer>; deadline: string | null; title: string;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(saved);
  const [i, setI] = useState(0);
  const [status, setStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [left, setLeft] = useState<number | null>(deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)) : null);
  const [submitting, startSubmit] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const unsaved = useRef<Record<string, Answer>>({});
  const q = questions[i]!;
  const answered = (id: string) => { const a = answers[id]; return !!a && (a.choice !== null || a.answer.trim() !== ""); };
  const unanswered = questions.filter((x) => !answered(x.id)).length;

  // Saves anything still waiting on the typing delay, then hands in.
  const finish = () => startSubmit(async () => {
    for (const [id, a] of Object.entries(unsaved.current)) {
      clearTimeout(timers.current[id]);
      await saveAnswer(attemptId, id, a.choice, a.choice === null ? a.answer : null);
    }
    unsaved.current = {};
    await submitQuiz(attemptId, quizId);
  });

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { finish(); return; }
    const t = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  function store(id: string, a: Answer, delay = 0) {
    setAnswers((x) => ({ ...x, [id]: a }));
    unsaved.current[id] = a;
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      delete unsaved.current[id];
      setStatus((s) => ({ ...s, [id]: "saving" }));
      const r = await saveAnswer(attemptId, id, a.choice, a.choice === null ? a.answer : null);
      setStatus((s) => ({ ...s, [id]: r.ok ? "saved" : "error" }));
      setErr(r.ok ? null : r.message ?? "Could not save your answer.");
    }, delay);
  }

  const mm = left !== null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : null;
  return (
    <div className="lq">
      <div className="lq-top">
        <strong>{title}</strong>
        <span className="lq-progress">{questions.length - unanswered} of {questions.length} answered</span>
        {mm && <span className={`lq-timer${left !== null && left < 60 ? " is-low" : ""}`} aria-live="polite">{mm} left</span>}
      </div>
      <nav className="lq-dots" aria-label="Questions">
        {questions.map((x, k) => <button key={x.id} type="button" className={`${k === i ? "is-on" : ""} ${answered(x.id) ? "is-done" : ""}`} onClick={() => { setI(k); setConfirm(false); }} aria-label={`Question ${k + 1}${answered(x.id) ? ", answered" : ""}`}>{k + 1}</button>)}
      </nav>
      {!confirm ? (
        <section className="lq-card">
          <div className="lq-meta"><span>Question {i + 1} of {questions.length}</span><span>{q.points} {q.points === 1 ? "point" : "points"}</span></div>
          <p className="lq-prompt" dir="auto">{q.prompt}</p>
          {q.kind === "mcq" ? (
            <div className="lq-opts" role="radiogroup">
              {q.options.map((o, k) => (
                <label key={k} className={`lq-opt${answers[q.id]?.choice === k ? " is-picked" : ""}`}>
                  <input type="radio" name={`q_${q.id}`} checked={answers[q.id]?.choice === k} onChange={() => store(q.id, { choice: k, answer: "" })} />
                  <span className="lq-opt__key">{String.fromCharCode(65 + k)}</span><span dir="auto">{o}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea className="ad-input lq-text" rows={5} dir="auto" value={answers[q.id]?.answer ?? ""} placeholder="Type your answer…"
              onChange={(e) => store(q.id, { choice: null, answer: e.target.value }, 700)} onBlur={(e) => store(q.id, { choice: null, answer: e.target.value })} />
          )}
          <div className="lq-save">{status[q.id] === "saving" ? "Saving…" : status[q.id] === "saved" ? "Saved" : status[q.id] === "error" ? "Not saved" : ""}</div>
          {err && <div className="ad-alert ad-alert--err" role="alert">{err}</div>}
          <div className="lq-nav">
            <button type="button" className="hk-btn hk-btn--ghost hk-btn--sm" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button>
            {i < questions.length - 1
              ? <button type="button" className="hk-btn hk-btn--primary hk-btn--sm" onClick={() => setI(i + 1)}>Next</button>
              : <button type="button" className="hk-btn hk-btn--primary hk-btn--sm" onClick={() => setConfirm(true)}>Finish</button>}
          </div>
        </section>
      ) : (
        <section className="lq-card lq-confirm">
          <h2>Hand in your quiz?</h2>
          <p>{unanswered ? `You have ${unanswered} unanswered ${unanswered === 1 ? "question" : "questions"}. ` : "You've answered every question. "}You can’t change your answers after handing in.</p>
          <div className="lq-nav">
            <button type="button" className="hk-btn hk-btn--ghost hk-btn--sm" onClick={() => setConfirm(false)}>Go back</button>
            <button type="button" className="hk-btn hk-btn--primary hk-btn--sm" disabled={submitting} onClick={finish}>{submitting ? "Handing in…" : "Hand in"}</button>
          </div>
        </section>
      )}
    </div>
  );
}
