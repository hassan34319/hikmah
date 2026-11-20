"use client";

import { useActionState, useState } from "react";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import { DEFAULT_FEEDBACK, type FeedbackQuestion } from "@/lib/feedback";
import { saveFeedbackForm, sendFeedbackEmails, type FbState } from "./actions";

const TYPES: [FeedbackQuestion["type"], string][] = [["rating", "Star rating (1 to 5)"], ["single", "Choose one"], ["multi", "Choose several"], ["text", "Short answer"], ["long", "Paragraph"]];

export function QuestionEditor({ offeringId, initial, intro }: { offeringId: string; initial: FeedbackQuestion[]; intro: string }) {
  const [state, action, pending] = useActionState<FbState, FormData>(saveFeedbackForm, {});
  const [qs, setQs] = useState<FeedbackQuestion[]>(initial);
  const update = (i: number, patch: Partial<FeedbackQuestion>) => setQs(qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= qs.length) return; const n = [...qs]; [n[i], n[j]] = [n[j]!, n[i]!]; setQs(n); };
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="ad-fields">
      <input type="hidden" name="offering_id" value={offeringId} />
      <input type="hidden" name="questions" value={JSON.stringify(qs)} />
      {state.message && <div className={`ad-alert ${state.ok ? "ad-alert--ok" : "ad-alert--err"}`}>{state.message}</div>}
      <label className="ad-label">Short note at the top <small>optional</small><input name="intro" className="ad-input" defaultValue={intro} placeholder="e.g. Thank you for attending Feel Good Fridays!" /></label>
      {qs.map((q, i) => (
        <div key={i} className="ad-q" style={{ gridTemplateColumns: "auto 1fr auto", alignItems: "start" }}>
          <span className="ad-q__num">{i + 1}</span>
          <div className="ad-fields" style={{ gap: 8 }}>
            <input className="ad-input" value={q.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Question" />
            <div className="ad-row">
              <select className="ad-input" value={q.type} onChange={(e) => update(i, { type: e.target.value as FeedbackQuestion["type"] })}>
                {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <label className="ad-switch" style={{ padding: 0 }}>Required<input type="checkbox" checked={!!q.required} onChange={(e) => update(i, { required: e.target.checked })} /></label>
            </div>
            {(q.type === "single" || q.type === "multi") && (
              <textarea className="ad-input" rows={3} placeholder="Choices, one per line" value={(q.options ?? []).join("\n")} onChange={(e) => update(i, { options: e.target.value.split("\n") })} />
            )}
          </div>
          <div className="ad-q__tools">
            <button type="button" className="ad-icon-btn" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button type="button" className="ad-icon-btn" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button type="button" className="ad-icon-btn ad-icon-btn--danger" onClick={() => setQs(qs.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="hk-btn hk-btn--ghost hk-btn--sm" onClick={() => setQs([...qs, { key: "", label: "", type: "rating" }])}>+ Add question</button>
        <button type="button" className="hk-btn hk-btn--ghost hk-btn--sm" onClick={() => setQs(DEFAULT_FEEDBACK)}>Reset to default</button>
        <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending} style={{ marginLeft: "auto" }}>{pending ? "Saving…" : "Save questions"}</button>
      </div>
    </form>
  );
}

export function SendPanel({ offeringId, total, missing, sentAt }: { offeringId: string; total: number; missing: number; sentAt: string | null }) {
  const [state, action, pending] = useActionState<FbState, FormData>(sendFeedbackEmails, {});
  const [audience, setAudience] = useState(sentAt ? "missing" : "all");
  const count = audience === "missing" ? missing : total;
  return (
    <form action={action} className="ad-fields" onSubmit={(e) => { if (!confirm(`Email the feedback form to ${count} people?`)) e.preventDefault(); }}>
      <input type="hidden" name="offering_id" value={offeringId} />
      {state.message && <div className={`ad-alert ${state.ok ? "ad-alert--ok" : "ad-alert--err"}`}>{state.message}</div>}
      <label className="ad-radio"><input type="radio" name="audience" value="all" checked={audience === "all"} onChange={() => setAudience("all")} /><span>Everyone who registered ({total})</span></label>
      <label className="ad-radio"><input type="radio" name="audience" value="missing" checked={audience === "missing"} onChange={() => setAudience("missing")} /><span>Only people who haven&apos;t answered yet ({missing})</span></label>
      <button className="hk-btn hk-btn--primary hk-btn--block" disabled={pending || count === 0}>{pending ? "Sending…" : `Send feedback form to ${count}`}</button>
    </form>
  );
}
