"use client";

import { useActionState, useState } from "react";
import { Button, TextInput } from "@hikmah/ui";
import { Chips, F, Select, SpamGuard, Success, keepValuesOnSubmit } from "@/components/PublicForm";
import { BATCH_OPTIONS, COURSE_OPTIONS, ENROLLMENT_OPTIONS, MENTORSHIP_AREAS } from "@/lib/programs-content";
import type { SubmitResult } from "@/lib/requests";
import { applyForMentorship } from "./actions";

export function MentorshipForm() {
  const [state, action, pending] = useActionState<SubmitResult, FormData>(applyForMentorship, {});
  const [area, setArea] = useState("");
  const [course, setCourse] = useState("");
  const e = state.errors ?? {};
  if (state.ok) return <Success title="Request received" text="JazakAllah khair. We'll match you with a suitable mentor and contact you to book your first conversation, in sha Allah." />;
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="hk-form" noValidate>
      <SpamGuard />
      {state.message && <div className="hk-alert hk-alert--error" role="alert">{state.message}</div>}
      <F label="Full name" name="full_name" error={e.full_name} required><TextInput id="full_name" name="full_name" autoComplete="name" /></F>
      <F label="Gender" name="gender" error={e.gender} required><Chips name="gender" options={["Male", "Female"]} /></F>
      <div className="hk-form__row">
        <F label="Date of birth" name="date_of_birth" error={e.date_of_birth} required><TextInput id="date_of_birth" name="date_of_birth" type="date" /></F>
        <F label="Phone (WhatsApp)" name="phone" error={e.phone} required><TextInput id="phone" name="phone" type="tel" inputMode="tel" placeholder="0300 1234567" autoComplete="tel" /></F>
      </div>
      <F label="Email" name="email" error={e.email} required><TextInput id="email" name="email" type="email" autoComplete="email" /></F>
      <F label="Area of mentorship" name="area" error={e.area} required>
        <select id="area" name="area" className="hk-input" defaultValue="" onChange={(ev) => setArea(ev.target.value)}>
          <option value="" disabled>Choose one</option>
          {MENTORSHIP_AREAS.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((i) => <option key={i}>{i}</option>)}</optgroup>)}
          <option>Others</option>
        </select>
      </F>
      {area === "Others" && <F label="Type the area of mentorship" name="area_other" error={e.area_other} required><TextInput id="area_other" name="area_other" /></F>}
      <div className="hk-form__row">
        <F label="Which course are/were you enrolled in?" name="course" error={e.course} required><Select name="course" options={COURSE_OPTIONS} onChange={setCourse} /></F>
        <F label="Which batch?" name="batch" error={e.batch} required><Select name="batch" options={BATCH_OPTIONS} /></F>
      </div>
      {course === "Others" && <F label="Type the course name" name="course_other" error={e.course_other} required><TextInput id="course_other" name="course_other" /></F>}
      <F label="Your current enrollment status at Hikmah" name="enrollment" error={e.enrollment} required><Chips name="enrollment" options={ENROLLMENT_OPTIONS} /></F>
      <Button type="submit" block disabled={pending}>{pending ? "Sending…" : "Apply for mentorship"}</Button>
    </form>
  );
}
