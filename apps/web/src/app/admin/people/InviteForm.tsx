"use client";

import { useActionState } from "react";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import { sendInvite, type InviteState } from "./actions";

type Opt = { id: string; label: string; group: string };

export function InviteForm({ rules, segmentId, options, reachable }: { rules: string; segmentId?: string; options: Opt[]; reachable: number }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(sendInvite, {});
  const groups = [...new Set(options.map((o) => o.group))];
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="ad-fields">
      <input type="hidden" name="rules" value={rules} />
      {segmentId && <input type="hidden" name="segment_id" value={segmentId} />}
      {state.message && <div className={`ad-alert ${state.ok ? "ad-alert--ok" : "ad-alert--err"}`}>{state.message}</div>}
      <label className="ad-label">Invite them to
        <select name="offering_id" className="ad-input" defaultValue="" required>
          <option value="" disabled>Choose a course or event</option>
          {groups.map((g) => <optgroup key={g} label={g}>{options.filter((o) => o.group === g).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>)}
        </select>
      </label>
      <label className="ad-label">Subject <small>optional, defaults to “You&apos;re invited: event name”</small><input name="subject" className="ad-input" maxLength={150} /></label>
      <label className="ad-label">Personal note <small>optional, shown above the event card</small><textarea name="message" className="ad-input" rows={4} maxLength={2000} placeholder="e.g. Since you enjoyed our last Feel Good Friday, we saved you a seat for this one." /></label>
      <label className="ad-switch" style={{ justifyContent: "flex-start", gap: 10 }}>
        <input type="checkbox" name="confirm" className="ad-check" style={{ appearance: "auto", width: 18, height: 18, flex: "0 0 18px", background: "none" }} />
        <span>Send to up to <strong>{reachable}</strong> opted-in {reachable === 1 ? "person" : "people"}<small>Anyone already registered for the chosen event is skipped.</small></span>
      </label>
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending || reachable === 0} style={{ justifySelf: "start" }}>{pending ? "Sending…" : "Send invite"}</button>
    </form>
  );
}
