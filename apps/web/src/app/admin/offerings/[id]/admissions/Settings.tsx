"use client";

import { useActionState } from "react";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import { addSlots, saveSettings, type AdmState } from "./actions";

export function SettingsForm({ offeringId, intakeYear, prompt }: { offeringId: string; intakeYear: number | null; prompt: string }) {
  const [s, act, pending] = useActionState<AdmState, FormData>(saveSettings, {});
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-fields">
      <input type="hidden" name="offering_id" value={offeringId} />
      {s.message && <div className={`ad-alert ${s.ok ? "ad-alert--ok" : "ad-alert--err"}`}>{s.message}</div>}
      <label className="ad-label">Intake year <small>used in student IDs, e.g. 2027 gives HKM-27-…</small>
        <input name="intake_year" type="number" min={2020} max={2100} className="ad-input" defaultValue={intakeYear ?? new Date().getFullYear() + 1} /></label>
      <label className="ad-label">Essay question <small>the last step of the test</small>
        <textarea name="essay_prompt" rows={3} className="ad-input" defaultValue={prompt} /></label>
      <button className="hk-btn hk-btn--ghost hk-btn--sm" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function SlotForm({ offeringId, venues }: { offeringId: string; venues: { id: string; name: string }[] }) {
  const [s, act, pending] = useActionState<AdmState, FormData>(addSlots, {});
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="am-slotform">
      <input type="hidden" name="offering_id" value={offeringId} />
      {s.message && <div className={`ad-alert am-full ${s.ok ? "ad-alert--ok" : "ad-alert--err"}`}>{s.message}</div>}
      <label className="ad-label">Day<input name="day" type="date" className="ad-input" required /></label>
      <label className="ad-label">Campus<select name="venue_id" className="ad-input">{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      <label className="ad-label">From<input name="from" type="time" className="ad-input" defaultValue="10:00" required /></label>
      <label className="ad-label">To<input name="to" type="time" className="ad-input" defaultValue="13:00" required /></label>
      <label className="ad-label">Every (min)<input name="every" type="number" min={5} max={240} className="ad-input" defaultValue={20} /></label>
      <label className="ad-label">Per slot<input name="capacity" type="number" min={1} max={50} className="ad-input" defaultValue={1} /></label>
      <button className="hk-btn hk-btn--primary hk-btn--sm am-full" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Adding…" : "Add slots"}</button>
    </form>
  );
}
