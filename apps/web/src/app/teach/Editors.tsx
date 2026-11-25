"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { LmsFile } from "@hikmah/db";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import { FileDrop } from "@/components/lms/FileDrop";
import type { Scope } from "@/lib/lms-server";
import { markAnswer, markSubmission, publishQuiz, saveAssignment, savePost, saveQuestion, saveQuiz, type TeachState } from "./actions";

function Msg({ s }: { s: TeachState }) {
  if (!s.message) return null;
  return <div className={`ad-alert ${s.ok ? "ad-alert--ok" : "ad-alert--err"}`} role="status">{s.message}</div>;
}

/** Course · subject picker with the sections this teacher teaches it in. */
function ScopePicker({ scopes, value, sections, onScope }: { scopes: Scope[]; value: string; sections: string[]; onScope: (v: string) => void }) {
  const scope = scopes.find((s) => `${s.offeringId}|${s.subjectId}` === value) ?? scopes[0];
  const [ticked, setTicked] = useState<string[]>(sections.length ? sections : scope?.sections.map((s) => s.id) ?? []);
  return (
    <>
      <label className="ad-label">Course and subject
        <select name="scope" className="ad-input" value={value} onChange={(e) => {
          onScope(e.target.value);
          const next = scopes.find((s) => `${s.offeringId}|${s.subjectId}` === e.target.value);
          setTicked(next?.sections.map((x) => x.id) ?? []);
        }}>
          {scopes.map((s) => <option key={`${s.offeringId}|${s.subjectId}`} value={`${s.offeringId}|${s.subjectId}`}>{s.code ? `${s.code} · ` : `${s.course} · `}{s.subject}</option>)}
        </select>
      </label>
      {scope && (
        <fieldset className="ad-fset"><legend>For these sections</legend>
          <div className="ad-chipset">
            {scope.sections.map((x) => (
              <label key={x.id}>
                <input type="checkbox" name="section" value={x.id} checked={ticked.includes(x.id)} onChange={(e) => setTicked((t) => e.target.checked ? [...t, x.id] : t.filter((y) => y !== x.id))} /><span>{x.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}

function useScope(scopes: Scope[], initial?: string) {
  const first = scopes[0] ? `${scopes[0].offeringId}|${scopes[0].subjectId}` : "";
  const [value, setValue] = useState(initial && scopes.some((s) => `${s.offeringId}|${s.subjectId}` === initial) ? initial : first);
  const scope = scopes.find((s) => `${s.offeringId}|${s.subjectId}` === value);
  return { value, setValue, scope };
}

export type PostDraft = { id?: string; kind: "material" | "announcement"; scope?: string; sections: string[]; title: string; topic: string; body: string; files: LmsFile[]; links: string };

export function PostEditor({ scopes, draft, topics }: { scopes: Scope[]; draft: PostDraft; topics: string[] }) {
  const [s, act, pending] = useActionState<TeachState, FormData>(savePost, {});
  const { value, setValue, scope } = useScope(scopes, draft.scope);
  const isAnn = draft.kind === "announcement";
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-card ad-fields lm-editor">
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <input type="hidden" name="kind" value={draft.kind} />
      <ScopePicker scopes={scopes} value={value} sections={draft.sections} onScope={setValue} />
      <label className="ad-label">Title<input name="title" className="ad-input" required defaultValue={draft.title} placeholder={isAnn ? "e.g. No class this Saturday" : "e.g. Lesson 4 slides: verb patterns"} /></label>
      {!isAnn && (
        <label className="ad-label">Week or topic <small>groups materials for students</small>
          <input name="topic" className="ad-input" defaultValue={draft.topic} list="lm-topics" placeholder="e.g. Week 3" />
          <datalist id="lm-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
      )}
      <label className="ad-label">{isAnn ? "Message" : "Notes"} {!isAnn && <small>optional</small>}
        <textarea name="body" className="ad-input" rows={isAnn ? 6 : 4} defaultValue={draft.body} required={isAnn} placeholder={isAnn ? "What do students need to know?" : "Anything to read before or after class"} />
      </label>
      {!isAnn && scope && <FileDrop key={scope.offeringId + scope.subjectId} target={{ kind: "content", offeringId: scope.offeringId, subjectId: scope.subjectId }} initial={draft.files} />}
      {!isAnn && (
        <label className="ad-label">Links <small>one per line, e.g. a YouTube video or Google Drive folder. Optional label: Label | https://…</small>
          <textarea name="links" className="ad-input" rows={2} defaultValue={draft.links} placeholder="https://" />
        </label>
      )}
      <label className="lm-check"><input type="checkbox" name="notify" defaultChecked={!draft.id} /> Email the students in these sections</label>
      <Msg s={s} />
      <div className="lm-actions">
        <button className="hk-btn hk-btn--primary" disabled={pending}>{pending ? "Saving…" : draft.id ? "Save changes" : isAnn ? "Post announcement" : "Post material"}</button>
        <Link href="/teach/materials" className="hk-btn hk-btn--ghost">Cancel</Link>
      </div>
    </form>
  );
}

export type AssignmentDraft = { id?: string; scope?: string; sections: string[]; title: string; instructions: string; files: LmsFile[]; due: string; max: number; allowLate: boolean };

export function AssignmentEditor({ scopes, draft }: { scopes: Scope[]; draft: AssignmentDraft }) {
  const [s, act, pending] = useActionState<TeachState, FormData>(saveAssignment, {});
  const { value, setValue, scope } = useScope(scopes, draft.scope);
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-card ad-fields lm-editor">
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <ScopePicker scopes={scopes} value={value} sections={draft.sections} onScope={setValue} />
      <label className="ad-label">Title<input name="title" className="ad-input" required defaultValue={draft.title} placeholder="e.g. Translate Surah Al-Asr" /></label>
      <label className="ad-label">Instructions<textarea name="instructions" className="ad-input" rows={6} defaultValue={draft.instructions} placeholder="What should students do, and how should they hand it in?" /></label>
      {scope && <FileDrop key={scope.offeringId + scope.subjectId} target={{ kind: "content", offeringId: scope.offeringId, subjectId: scope.subjectId }} initial={draft.files} label="Attachments" hint="Worksheets or reading for this assignment. Up to 50 MB each." />}
      <div className="lm-two">
        <label className="ad-label">Due <small>Karachi time</small><input name="due_at" type="datetime-local" className="ad-input" required defaultValue={draft.due} /></label>
        <label className="ad-label">Total marks<input name="max_marks" type="number" min={1} max={1000} step="0.5" className="ad-input" required defaultValue={draft.max} /></label>
      </div>
      <label className="lm-check"><input type="checkbox" name="allow_late" defaultChecked={draft.allowLate} /> Accept late work (it is marked as late)</label>
      <label className="lm-check"><input type="checkbox" name="notify" defaultChecked={!draft.id} /> Email the students in these sections</label>
      <Msg s={s} />
      <div className="lm-actions">
        <button className="hk-btn hk-btn--primary" disabled={pending}>{pending ? "Saving…" : draft.id ? "Save changes" : "Set assignment"}</button>
        <Link href={draft.id ? `/teach/assignments/${draft.id}` : "/teach/assignments"} className="hk-btn hk-btn--ghost">Cancel</Link>
      </div>
    </form>
  );
}

export function MarkForm({ assignmentId, submissionId, max, marks, feedback }: { assignmentId: string; submissionId: string; max: number; marks: number | null; feedback: string | null }) {
  const [s, act, pending] = useActionState<TeachState, FormData>(markSubmission, {});
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="lm-mark">
      <input type="hidden" name="assignment_id" value={assignmentId} /><input type="hidden" name="submission_id" value={submissionId} />
      <label className="lm-mark__marks"><input name="marks" type="number" min={0} max={max} step="0.5" className="ad-input" defaultValue={marks ?? ""} aria-label="Marks" /><span>/ {max}</span></label>
      <textarea name="feedback" className="ad-input" rows={2} defaultValue={feedback ?? ""} placeholder="Feedback for the student (optional)" aria-label="Feedback" />
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      {s.message && <span className={s.ok ? "lm-ok" : "lm-err"}>{s.message}</span>}
    </form>
  );
}

export type QuizDraft = { id?: string; scope?: string; sections: string[]; title: string; instructions: string; opens: string; closes: string; limit: string; shuffle: boolean; showAnswers: boolean };

export function QuizSettings({ scopes, draft }: { scopes: Scope[]; draft: QuizDraft }) {
  const [s, act, pending] = useActionState<TeachState, FormData>(saveQuiz, {});
  const { value, setValue } = useScope(scopes, draft.scope);
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-fields">
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <ScopePicker scopes={scopes} value={value} sections={draft.sections} onScope={setValue} />
      <label className="ad-label">Title<input name="title" className="ad-input" required defaultValue={draft.title} placeholder="e.g. Week 3 vocabulary quiz" /></label>
      <label className="ad-label">Instructions <small>optional</small><textarea name="instructions" className="ad-input" rows={3} defaultValue={draft.instructions} /></label>
      <div className="lm-two">
        <label className="ad-label">Opens <small>empty: as soon as published</small><input name="opens_at" type="datetime-local" className="ad-input" defaultValue={draft.opens} /></label>
        <label className="ad-label">Closes <small>empty: stays open</small><input name="closes_at" type="datetime-local" className="ad-input" defaultValue={draft.closes} /></label>
        <label className="ad-label">Time limit (minutes) <small>empty: no limit</small><input name="time_limit_min" type="number" min={1} max={600} className="ad-input" defaultValue={draft.limit} /></label>
      </div>
      <label className="lm-check"><input type="checkbox" name="shuffle" defaultChecked={draft.shuffle} /> Shuffle the question order for each student</label>
      <label className="lm-check"><input type="checkbox" name="show_answers" defaultChecked={draft.showAnswers} /> Show students the correct answers after the closing time (needs a closing time above)</label>
      <Msg s={s} />
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Saving…" : draft.id ? "Save settings" : "Create quiz and add questions"}</button>
    </form>
  );
}

export type QuestionDraft = { id?: string; kind: "mcq" | "short"; prompt: string; options: string[]; correct: number | null; points: number; model: string };

export function QuestionEditor({ quizId, draft, onDone }: { quizId: string; draft: QuestionDraft; onDone?: () => void }) {
  const [s, act, pending] = useActionState<TeachState, FormData>(async (p: TeachState, f: FormData) => {
    const r = await saveQuestion(p, f);
    if (r.ok) { onDone?.(); if (!draft.id) { setOptions(["", "", "", ""]); setCorrect(null); setFormKey((k) => k + 1); } }
    return r;
  }, {});
  const [kind, setKind] = useState(draft.kind);
  const [options, setOptions] = useState<string[]>(draft.options.length ? [...draft.options, ...(draft.options.length < 4 ? Array(4 - draft.options.length).fill("") : [])] : ["", "", "", ""]);
  const [correct, setCorrect] = useState<number | null>(draft.correct);
  const [formKey, setFormKey] = useState(0);
  return (
    <form key={formKey} onSubmit={keepValuesOnSubmit(act)} className="ad-fields lm-qedit">
      <input type="hidden" name="quiz_id" value={quizId} />
      {draft.id && <input type="hidden" name="question_id" value={draft.id} />}
      <div className="lm-qedit__top">
        <div className="lm-seg" role="radiogroup" aria-label="Question type">
          <label><input type="radio" name="kind" value="mcq" checked={kind === "mcq"} onChange={() => setKind("mcq")} /> Multiple choice</label>
          <label><input type="radio" name="kind" value="short" checked={kind === "short"} onChange={() => setKind("short")} /> Short answer</label>
        </div>
        <label className="lm-points">Points<input name="points" type="number" min={0.5} max={100} step="0.5" className="ad-input" defaultValue={draft.points} /></label>
      </div>
      <label className="ad-label">Question<textarea name="prompt" className="ad-input" rows={2} required defaultValue={draft.prompt} dir="auto" placeholder="Type the question. Arabic works too." /></label>
      {kind === "mcq" ? (
        <fieldset className="ad-fset"><legend>Options <small>tick the correct one</small></legend>
          <div className="lm-opts">
            {options.map((o, i) => (
              <div key={i} className={`lm-opt${correct === i ? " is-correct" : ""}`}>
                <input type="radio" name="correct" value={i} checked={correct === i} onChange={() => setCorrect(i)} aria-label={`Option ${i + 1} is correct`} />
                <input name="option" className="ad-input" value={o} dir="auto" placeholder={`Option ${i + 1}`} onChange={(e) => setOptions((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
                {options.length > 2 && <button type="button" className="lm-x" aria-label={`Remove option ${i + 1}`} onClick={() => { setOptions((x) => x.filter((_, j) => j !== i)); setCorrect((c) => (c === i ? null : c !== null && c > i ? c - 1 : c)); }}>✕</button>}
              </div>
            ))}
          </div>
          {options.length < 8 && <button type="button" className="ad-icon-btn" onClick={() => setOptions((x) => [...x, ""])}>+ Add option</button>}
        </fieldset>
      ) : (
        <label className="ad-label">Model answer <small>only you see this, to help with marking</small><textarea name="model_answer" className="ad-input" rows={2} defaultValue={draft.model} dir="auto" /></label>
      )}
      <Msg s={s} />
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Saving…" : draft.id ? "Save question" : "Add question"}</button>
    </form>
  );
}

export function QuestionCard({ quizId, n, q, locked, children }: { quizId: string; n: number; q: QuestionDraft; locked: boolean; children: React.ReactNode }) {
  const [edit, setEdit] = useState(false);
  return (
    <li className="lm-q">
      <div className="lm-q__head">
        <span className="lm-q__n">{n}</span>
        <span className="ad-muted">{q.kind === "mcq" ? "Multiple choice" : "Short answer"} · {q.points} {q.points === 1 ? "point" : "points"}</span>
        <div className="lm-q__tools">{children}{!locked && <button type="button" className="ad-icon-btn" onClick={() => setEdit((e) => !e)}>{edit ? "Close" : "Edit"}</button>}</div>
      </div>
      {edit ? <QuestionEditor quizId={quizId} draft={q} onDone={() => setEdit(false)} /> : (
        <>
          <p className="lm-q__prompt" dir="auto">{q.prompt}</p>
          {q.kind === "mcq" ? (
            <ol className="lm-q__opts" type="a">{q.options.map((o, i) => <li key={i} className={q.correct === i ? "is-correct" : ""} dir="auto">{o}{q.correct === i && <span className="lm-tick"> ✓ correct</span>}</li>)}</ol>
          ) : q.model ? <p className="ad-muted" dir="auto">Model answer: {q.model}</p> : null}
        </>
      )}
    </li>
  );
}

export function PublishForm({ quizId, published, questions }: { quizId: string; published: boolean; questions: number }) {
  const [s, act, pending] = useActionState<TeachState, FormData>(publishQuiz, {});
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-fields" style={{ gap: 10 }}>
      <input type="hidden" name="quiz_id" value={quizId} /><input type="hidden" name="publish" value={published ? "0" : "1"} />
      {!published && <label className="lm-check"><input type="checkbox" name="notify" defaultChecked /> Email the students when it’s published</label>}
      <Msg s={s} />
      <button className={`hk-btn hk-btn--sm ${published ? "hk-btn--ghost" : "hk-btn--primary"}`} disabled={pending || (!published && !questions)}>
        {pending ? "Saving…" : published ? "Unpublish" : `Publish quiz (${questions} ${questions === 1 ? "question" : "questions"})`}
      </button>
    </form>
  );
}

export function AttemptMarkForm({ quizId, attemptId, feedback, children }: { quizId: string; attemptId: string; feedback: string | null; children: React.ReactNode }) {
  const [s, act, pending] = useActionState<TeachState, FormData>(markAnswer, {});
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-fields">
      <input type="hidden" name="quiz_id" value={quizId} /><input type="hidden" name="attempt_id" value={attemptId} />
      {children}
      <label className="ad-label">Feedback for the student <small>optional</small><textarea name="feedback" className="ad-input" rows={2} defaultValue={feedback ?? ""} /></label>
      <Msg s={s} />
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Saving…" : "Save marks"}</button>
    </form>
  );
}
