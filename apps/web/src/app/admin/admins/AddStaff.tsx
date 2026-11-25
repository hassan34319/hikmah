"use client";

import { useActionState } from "react";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import { setRole, type StaffState } from "./actions";

export function AddStaff() {
  const [state, action, pending] = useActionState<StaffState, FormData>(setRole, {});
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="ad-fields">
      {state.message && <div className={`ad-alert ${state.ok ? "ad-alert--ok" : "ad-alert--err"}`}>{state.message}</div>}
      <label className="ad-label">Their email <small>they must have signed up on the website already</small><input name="email" type="email" className="ad-input" required placeholder="name@example.com" /></label>
      <label className="ad-label">Access
        <select name="role" className="ad-input" defaultValue="volunteer">
          <option value="volunteer">Volunteer: door check-in only</option>
          <option value="faculty">Teacher: posts materials, assignments and quizzes for their classes</option>
          <option value="interviewer">Interviewer: scores admission interviews only</option>
          <option value="admin">Admin: everything except managing admins</option>
          <option value="super_admin">Super admin: everything, including this page</option>
        </select>
      </label>
      <small className="ad-muted">Someone can have more than one role. Add them again with another role to combine, e.g. volunteer and interviewer.</small>
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Saving…" : "Give access"}</button>
    </form>
  );
}
