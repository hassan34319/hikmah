"use client";

import { useActionState, useState } from "react";
import { TYPE_LABELS } from "@/lib/field-types";
import { createField, type FieldState } from "./actions";

export function NewFieldForm({ attachTo }: { attachTo?: string }) {
  const [state, action, pending] = useActionState<FieldState, FormData>(createField, {});
  const [type, setType] = useState("short_text");
  return (
    <form action={action} className="ad-fields" key={state.ok ? state.message + String(Date.now()) : "f"}>
      {attachTo && <input type="hidden" name="attach_to" value={attachTo} />}
      {state.message && <div className={`ad-alert ${state.ok ? "ad-alert--ok" : "ad-alert--err"}`}>{state.message}</div>}
      <label className="ad-label">Question<input name="label" className="ad-input" placeholder="e.g. Will you attend in person?" required /></label>
      <label className="ad-label">Answer type
        <select name="type" className="ad-input" value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(TYPE_LABELS).filter(([k]) => k !== "file").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {type.endsWith("select") && (
        <label className="ad-label">Choices <small>one per line</small><textarea name="options" className="ad-input" rows={4} placeholder={"In person, Main campus\nWatch the live stream"} /></label>
      )}
      <label className="ad-label">Help text <small>optional</small><input name="help_text" className="ad-input" /></label>
      {attachTo && <label className="ad-switch">Required<input type="checkbox" name="required" defaultChecked /></label>}
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Adding…" : attachTo ? "Create and add to this form" : "Create question"}</button>
    </form>
  );
}
