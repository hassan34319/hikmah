"use client";

import { useActionState } from "react";
import { Button, TextInput } from "@hikmah/ui";
import { F, Select, SpamGuard, Success, keepValuesOnSubmit } from "@/components/PublicForm";
import { WORK_FORMATS } from "@/lib/programs-content";
import type { SubmitResult } from "@/lib/requests";
import { inviteHikmah } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<SubmitResult, FormData>(inviteHikmah, {});
  const e = state.errors ?? {};
  if (state.ok) return <Success title="Invitation received" text="JazakAllah khair. Our team will contact you to understand your audience and agree on a topic, format and date." />;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="hk-form" noValidate>
      <SpamGuard />
      {state.message && <div className="hk-alert hk-alert--error" role="alert">{state.message}</div>}
      <F label="Session format" name="format" error={e.format} required><Select name="format" options={WORK_FORMATS} /></F>
      <F label="Organisation name" name="organisation" error={e.organisation} required><TextInput id="organisation" name="organisation" autoComplete="organization" /></F>
      <div className="hk-form__row">
        <F label="Preferred date" name="preferred_date" error={e.preferred_date}><TextInput id="preferred_date" name="preferred_date" type="date" min={today} /></F>
        <F label="Preferred time" name="preferred_time" error={e.preferred_time}><TextInput id="preferred_time" name="preferred_time" type="time" /></F>
      </div>
      <F label="Preferred topic" name="topic" error={e.topic} hint="Not sure? Leave it blank and we'll recommend one."><TextInput id="topic" name="topic" placeholder="e.g. Managing stress through faith" /></F>
      <div className="hk-form__row">
        <F label="Your name" name="name" error={e.name} required><TextInput id="name" name="name" autoComplete="name" /></F>
        <F label="Designation" name="designation" error={e.designation}><TextInput id="designation" name="designation" autoComplete="organization-title" placeholder="e.g. HR Manager" /></F>
      </div>
      <div className="hk-form__row">
        <F label="Email" name="email" error={e.email} required><TextInput id="email" name="email" type="email" autoComplete="email" /></F>
        <F label="Phone / WhatsApp" name="phone" error={e.phone} required><TextInput id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" /></F>
      </div>
      <Button type="submit" block disabled={pending}>{pending ? "Sending…" : "Send invitation request"}</Button>
    </form>
  );
}
