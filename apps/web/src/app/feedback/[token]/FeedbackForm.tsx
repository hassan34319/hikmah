"use client";

import { useActionState, useState } from "react";
import { Button } from "@hikmah/ui";
import { Success, keepValuesOnSubmit } from "@/components/PublicForm";
import type { FeedbackQuestion } from "@/lib/feedback";
import { sendFeedback, type FeedbackState } from "./actions";

function Rating({ q, initial }: { q: FeedbackQuestion; initial?: number }) {
  const [v, setV] = useState(initial ?? 0);
  return (
    <div className="fb-stars" role="radiogroup" aria-label={q.label}>
      <input type="hidden" name={q.key} value={v || ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={v === n} className={n <= v ? "on" : ""} onClick={() => setV(n)}>
          <span aria-hidden="true">★</span><span className="hk-sr-only">{n} out of 5</span>
        </button>
      ))}
      <span className="fb-stars__label">{["", "Poor", "Fair", "Good", "Very good", "Excellent"][v]}</span>
    </div>
  );
}

export function FeedbackForm({ token, questions, previous, anonymous }: {
  token: string; questions: FeedbackQuestion[]; previous: Record<string, unknown> | null; anonymous: boolean;
}) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(sendFeedback, {});
  const e = state.errors ?? {};
  if (state.ok) return <Success title="JazakAllah khair" text="Your feedback has been saved. It really helps us plan better sessions." />;
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="hk-form" noValidate>
      <input type="hidden" name="token" value={token} />
      {previous && <div className="hk-alert hk-alert--info">You already sent feedback. You can change your answers and send again.</div>}
      {state.message && <div className="hk-alert hk-alert--error" role="alert">{state.message}</div>}
      {questions.map((q) => {
        const prev = previous?.[q.key];
        return (
          <div key={q.key} className="fb-q">
            <span className="hk-field__label">{q.label}{q.required ? " *" : ""}</span>
            {q.type === "rating" && <Rating q={q} initial={typeof prev === "number" ? prev : undefined} />}
            {(q.type === "single" || q.type === "multi") && (
              <div className="hk-segment">
                {(q.options ?? []).map((o) => (
                  <label key={o} className="hk-chip">
                    <input type={q.type === "multi" ? "checkbox" : "radio"} name={q.key} value={o}
                      defaultChecked={Array.isArray(prev) ? prev.includes(o) : prev === o} />{o}
                  </label>
                ))}
              </div>
            )}
            {q.type === "text" && <input name={q.key} className="hk-input" defaultValue={typeof prev === "string" ? prev : ""} aria-label={q.label} />}
            {q.type === "long" && <textarea name={q.key} className="hk-input" rows={4} defaultValue={typeof prev === "string" ? prev : ""} aria-label={q.label} />}
            {e[q.key] && <span className="hk-field__error">{e[q.key]}</span>}
          </div>
        );
      })}
      <label className="hk-check"><input type="checkbox" name="anonymous" defaultChecked={anonymous} />Submit anonymously (staff won&apos;t see your name with your answers)</label>
      <Button type="submit" block disabled={pending}>{pending ? "Sending…" : "Submit feedback"}</Button>
    </form>
  );
}
