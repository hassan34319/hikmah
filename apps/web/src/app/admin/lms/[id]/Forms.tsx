"use client";

import { useActionState, useState } from "react";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import { WEEKDAYS_SHORT, WEEK_ORDER } from "@/lib/lms";
import { addPeriod, addSection, addSubject, assignTeacher, placeStudents, type LmsState } from "./actions";

type Opt = { id: string; name: string };

function Msg({ s }: { s: LmsState }) {
  if (!s.message) return null;
  return <div className={`ad-alert ${s.ok ? "ad-alert--ok" : "ad-alert--err"}`} role="status">{s.message}</div>;
}

export function AddSectionForm({ offeringId, year, venues }: { offeringId: string; year: number; venues: Opt[] }) {
  const [s, act, pending] = useActionState<LmsState, FormData>(addSection, {});
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="lm-inline">
      <input type="hidden" name="offering_id" value={offeringId} /><input type="hidden" name="year" value={year} />
      <Msg s={s} />
      <label className="ad-label">New section<input name="name" className="ad-input" placeholder="e.g. Weekend Morning" required /></label>
      <label className="ad-label">Campus<select name="venue_id" className="ad-input"><option value="">Not set</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending}>{pending ? "Adding…" : "Add section"}</button>
    </form>
  );
}

export function AddSubjectForm({ offeringId }: { offeringId: string }) {
  const [s, act, pending] = useActionState<LmsState, FormData>(addSubject, {});
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="lm-inline">
      <input type="hidden" name="offering_id" value={offeringId} />
      <Msg s={s} />
      <label className="ad-label">New subjects <small>separate several with commas</small><input name="name" className="ad-input" placeholder="e.g. Quranic Arabic, Tajweed, Tafseer" required /></label>
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
    </form>
  );
}

export function AssignTeacherForm({ offeringId, subjects, sections, teachers }: { offeringId: string; subjects: Opt[]; sections: Opt[]; teachers: Opt[] }) {
  const [s, act, pending] = useActionState<LmsState, FormData>(assignTeacher, {});
  if (!teachers.length) return <p className="ad-muted" style={{ margin: 0 }}>No teachers yet. Give someone the Teacher role on the Admins page first.</p>;
  if (!subjects.length || !sections.length) return <p className="ad-muted" style={{ margin: 0 }}>Add sections and subjects first.</p>;
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-fields" style={{ gap: 10 }}>
      <input type="hidden" name="offering_id" value={offeringId} />
      <Msg s={s} />
      <div className="lm-two">
        <label className="ad-label">Subject<select name="subject_id" className="ad-input" required>{subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="ad-label">Teacher<select name="teacher_id" className="ad-input" required>{teachers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      </div>
      <fieldset className="ad-fset"><legend>In these sections</legend>
        <div className="ad-chipset">{sections.map((x) => <label key={x.id}><input type="checkbox" name="section" value={x.id} defaultChecked /><span>{x.name}</span></label>)}</div>
      </fieldset>
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Saving…" : "Assign teacher"}</button>
    </form>
  );
}

export function AddPeriodForm({ offeringId, subjects, sections, teachers }: { offeringId: string; subjects: Opt[]; sections: Opt[]; teachers: Opt[] }) {
  const [s, act, pending] = useActionState<LmsState, FormData>(addPeriod, {});
  if (!sections.length) return <p className="ad-muted" style={{ margin: 0 }}>Add a section first.</p>;
  return (
    <form onSubmit={keepValuesOnSubmit(act)} className="ad-fields" style={{ gap: 10 }}>
      <input type="hidden" name="offering_id" value={offeringId} />
      <Msg s={s} />
      <fieldset className="ad-fset"><legend>Sections</legend>
        <div className="ad-chipset">{sections.map((x) => <label key={x.id}><input type="checkbox" name="section" value={x.id} /><span>{x.name}</span></label>)}</div>
      </fieldset>
      <fieldset className="ad-fset"><legend>Days</legend>
        <div className="ad-chipset">{WEEK_ORDER.map((d) => <label key={d}><input type="checkbox" name="weekday" value={d} /><span>{WEEKDAYS_SHORT[d]}</span></label>)}</div>
      </fieldset>
      <div className="lm-two">
        <label className="ad-label">Starts<input name="starts" type="time" className="ad-input" required defaultValue="09:00" /></label>
        <label className="ad-label">Ends<input name="ends" type="time" className="ad-input" required defaultValue="10:30" /></label>
        <label className="ad-label">Subject<select name="subject_id" className="ad-input"><option value="">None (e.g. break, assembly)</option>{subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="ad-label">Teacher<select name="teacher_id" className="ad-input"><option value="">Not set</option>{teachers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="ad-label">Room<input name="room" className="ad-input" placeholder="e.g. Room 3" /></label>
      </div>
      <button className="hk-btn hk-btn--primary hk-btn--sm" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Adding…" : "Add to timetable"}</button>
    </form>
  );
}

export type RosterRow = { userId: string; name: string; email: string; studentId: string | null; section: string | null; sectionId: string | null; since: string | null };

export function Roster({ offeringId, rows, sections, emptyText, placeLabel = "Move ticked to" }: { offeringId: string; rows: RosterRow[]; sections: Opt[]; emptyText: string; placeLabel?: string }) {
  const [s, act, pending] = useActionState<LmsState, FormData>(placeStudents, {});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const all = rows.length > 0 && picked.size === rows.length;
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  if (!rows.length) return <p className="ad-muted" style={{ margin: 0, padding: "14px 18px" }}>{emptyText}</p>;
  return (
    <form onSubmit={keepValuesOnSubmit(act)}>
      <input type="hidden" name="offering_id" value={offeringId} />
      {[...picked].map((u) => <input key={u} type="hidden" name="user" value={u} />)}
      <div className="lm-bar">
        <Msg s={s} />
        <span className="ad-muted">{picked.size ? `${picked.size} ticked` : "Tick students to move them"}</span>
        <select name="section_id" className="ad-input" aria-label="Section" defaultValue="">
          <option value="" disabled>{placeLabel}…</option>
          {sections.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <button className="hk-btn hk-btn--primary hk-btn--sm" name="op" value="place" disabled={pending || !picked.size}>{pending ? "Saving…" : "Move"}</button>
        {rows.some((r) => r.sectionId) && <button className="ad-icon-btn ad-icon-btn--danger" name="op" value="remove" disabled={pending || !picked.size}>Remove from course</button>}
      </div>
      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead><tr>
            <th style={{ width: 36 }}><input type="checkbox" aria-label="Tick all" checked={all} onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.userId)))} /></th>
            <th>Student</th><th>Student ID</th><th>Section</th><th>Since</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td><input type="checkbox" aria-label={`Tick ${r.name}`} checked={picked.has(r.userId)} onChange={() => toggle(r.userId)} /></td>
                <td><strong>{r.name}</strong><div className="ad-muted">{r.email}</div></td>
                <td><code className="lm-sid">{r.studentId ?? "not issued"}</code></td>
                <td>{r.section ?? <span className="ad-muted">not placed</span>}</td>
                <td className="ad-muted">{r.since ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
