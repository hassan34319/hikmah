"use client";

import { useActionState, useState } from "react";
import { INTEREST_OPTIONS, OCCUPATION_OPTIONS, type ProfileRow } from "@hikmah/db";
import { Button, Field, TextInput } from "@hikmah/ui";
import { saveProfile, type ProfileState } from "./actions";

const HEARD_FROM = ["WhatsApp", "Instagram", "Facebook", "YouTube", "Friend or family", "University", "Masjid", "Other"];

export function ProfileForm({ profile, next, submitLabel }: { profile: ProfileRow; next: string; submitLabel: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  const v = (state.values ?? {}) as Partial<Record<keyof ProfileRow | "whatsapp_same", unknown>>;
  const val = (k: keyof ProfileRow) => String(v[k] ?? profile[k] ?? "");
  const err = state.errors ?? {};

  const [occupation, setOccupation] = useState<string>(String(v.occupation_type ?? profile.occupation_type ?? ""));
  const [whatsappSame, setWhatsappSame] = useState<boolean>(
    v.whatsapp_same !== undefined ? Boolean(v.whatsapp_same) : !profile.whatsapp || profile.whatsapp === profile.phone,
  );
  const interests = new Set((v.interests as string[] | undefined) ?? profile.interests ?? []);
  const studying = occupation === "student" || occupation === "both";
  const working = occupation === "professional" || occupation === "both";

  return (
    <form action={action} className="hk-form" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.message && <div className="hk-alert hk-alert--error" role="alert">{state.message}</div>}

      <h2 style={{ fontSize: 20 }}>About you</h2>
      <Field label="Full name" htmlFor="full_name" error={err.full_name}>
        <TextInput id="full_name" name="full_name" autoComplete="name" defaultValue={val("full_name")} required />
      </Field>
      <div className="hk-form__row">
        <Field label="Email" htmlFor="email" hint="This is the email you signed in with.">
          <TextInput id="email" value={profile.email} readOnly disabled />
        </Field>
        <Field label="Date of birth" htmlFor="date_of_birth" error={err.date_of_birth}>
          <TextInput id="date_of_birth" name="date_of_birth" type="date" defaultValue={val("date_of_birth")} required />
        </Field>
      </div>
      <div className="hk-form__row">
        <Field label="Phone number" htmlFor="phone" error={err.phone}>
          <TextInput id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0300 1234567" defaultValue={val("phone")} required />
        </Field>
        <Field label="WhatsApp number" htmlFor="whatsapp" error={err.whatsapp}>
          {whatsappSame
            ? <TextInput id="whatsapp" value="Same as phone" readOnly disabled />
            : <TextInput id="whatsapp" name="whatsapp" type="tel" inputMode="tel" placeholder="0300 1234567" defaultValue={val("whatsapp")} />}
        </Field>
      </div>
      <label className="hk-check">
        <input type="checkbox" name="whatsapp_same" checked={whatsappSame} onChange={(e) => setWhatsappSame(e.target.checked)} />
        My WhatsApp number is the same as my phone
      </label>

      <h2 style={{ fontSize: 20, marginTop: 8 }}>What do you do?</h2>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="hk-field__label" style={{ marginBottom: 8 }}>I am a</legend>
        <div className="hk-segment">
          {OCCUPATION_OPTIONS.map((o) => (
            <label key={o.value} className="hk-chip">
              <input type="radio" name="occupation_type" value={o.value} checked={occupation === o.value} onChange={() => setOccupation(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
        {err.occupation_type && <span className="hk-field__error">{err.occupation_type}</span>}
      </fieldset>

      {studying && (
        <div className="hk-form__row">
          <Field label="University or college" htmlFor="university" error={err.university}>
            <TextInput id="university" name="university" defaultValue={val("university")} />
          </Field>
          <Field label="Degree and year" htmlFor="degree" hint="For example BS Computer Science, 3rd year">
            <TextInput id="degree" name="degree" defaultValue={val("degree")} />
          </Field>
        </div>
      )}
      {working && (
        <div className="hk-form__row">
          <Field label="Company or organisation" htmlFor="company" error={err.company}>
            <TextInput id="company" name="company" autoComplete="organization" defaultValue={val("company")} />
          </Field>
          <Field label="Job title" htmlFor="job_title">
            <TextInput id="job_title" name="job_title" autoComplete="organization-title" defaultValue={val("job_title")} />
          </Field>
        </div>
      )}

      <h2 style={{ fontSize: 20, marginTop: 8 }}>Where are you based?</h2>
      <Field label="Address" htmlFor="address_line" hint="Optional. Helps us plan events closer to you.">
        <TextInput id="address_line" name="address_line" autoComplete="street-address" defaultValue={val("address_line")} />
      </Field>
      <div className="hk-form__row">
        <Field label="Area" htmlFor="area" error={err.area}>
          <TextInput id="area" name="area" placeholder="Gulshan, DHA, North Nazimabad..." defaultValue={val("area")} required />
        </Field>
        <Field label="City" htmlFor="city" error={err.city}>
          <TextInput id="city" name="city" autoComplete="address-level2" defaultValue={val("city") || "Karachi"} required />
        </Field>
      </div>

      <h2 style={{ fontSize: 20, marginTop: 8 }}>What interests you?</h2>
      <div className="hk-segment">
        {INTEREST_OPTIONS.map((i) => (
          <label key={i} className="hk-chip">
            <input type="checkbox" name="interests" value={i} defaultChecked={interests.has(i)} />{i}
          </label>
        ))}
      </div>
      <Field label="How did you hear about Hikmah?" htmlFor="heard_from">
        <select id="heard_from" name="heard_from" className="hk-input" defaultValue={val("heard_from")}>
          <option value="">Choose one</option>
          {HEARD_FROM.map((h) => <option key={h}>{h}</option>)}
        </select>
      </Field>

      <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
        <label className="hk-check"><input type="checkbox" name="email_opt_in" defaultChecked={profile.email_opt_in} />Email me about new courses and events</label>
        <label className="hk-check"><input type="checkbox" name="whatsapp_opt_in" defaultChecked={profile.whatsapp_opt_in} />Send me updates on WhatsApp</label>
      </div>

      <Button type="submit" block disabled={pending}>{pending ? "Saving..." : submitLabel}</Button>
    </form>
  );
}
