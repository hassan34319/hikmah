"use client";

import { useActionState, useState } from "react";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import { recordInterview, type AdmState } from "../offerings/[id]/admissions/actions";

export function ScoreForm({ id, score, notes }: { id: string; score: number | null; notes: string | null }) {
  const [s, act, pending] = useActionState<AdmState, FormData>(recordInterview, {});
  const [v, setV] = useState<number>(score ?? 7);
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-fields">
      <input type="hidden" name="id" value={id} />
      {s.message && <div className={`ad-alert ${s.ok ? "ad-alert--ok" : "ad-alert--err"}`}>{s.message}</div>}
      <label className="ad-label">Score out of 10
        <div className="iv-score">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" aria-pressed={v === n} onClick={() => setV(n)}>{n}</button>
          ))}
        </div>
        <input type="hidden" name="score" value={v} />
      </label>
      <label className="ad-label">Notes <small>what stood out, concerns, suggested batch</small>
        <textarea name="notes" rows={4} className="ad-input" defaultValue={notes ?? ""} placeholder="e.g. Clear motivation, good Arabic basics. Prefers weekend batch." /></label>
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Saving…" : score != null ? "Update score" : "Save score"}</button>
    </form>
  );
}
