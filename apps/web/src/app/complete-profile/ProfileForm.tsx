"use client";

import { useActionState, useState } from "react";
import { GENDER_OPTIONS, INTEREST_OPTIONS, MAX_INTERESTS, OCCUPATION_OPTIONS, type ProfileRow } from "@hikmah/db";
import { Button, Field, TextInput } from "@hikmah/ui";
import { saveProfile, type ProfileState } from "./actions";

const HEARD_FROM = ["WhatsApp", "Instagram", "Facebook", "YouTube", "Friend or family", "University", "Masjid", "Other"];

export function ProfileForm({ profile, next, submitLabel }: { profile: ProfileRow; next: string; submitLabel: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  const v = (state.values ?? {}) as Partial<Record<keyof ProfileRow, unknown>>;
  const val = (k: keyof ProfileRow) => String(v[k] ?? profile[k] ?? "");
  const err = state.errors ?? {};

  const [occupation, setOccupation] = useState<string>(val("occupation_type"));
  const [gender, setGender] = useState<string>(val("gender"));
  const [interests, setInterests] = useState<string[]>((v.interests as string[] | undefined) ?? profile.interests ?? []);
  const studying = occupation === "student" || occupation === "both";
  const working = occupation === "professional" || occupation === "both";
  const full = interests.length >= MAX_INTERESTS;

  const toggleInterest = (i: string) =>
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < MAX_INTERESTS ? [...cur, i] : cur));

  return (
    <form action={action} className="hk-form" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.message && <div className="hk-alert hk-alert--error" role="alert">{state.message}</div>}

      <h2 style={{ fontSize: 20 }}>About you</h2>
      <Field label="Full name" htmlFor="full_name" error={err.full_name}>
        <TextInput id="full_name" name="full_name" autoComplete="name" defaultValue={val("full_name")} required />
      </Field>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="hk-field__label" style={{ marginBottom: 8 }}>Gender</legend>
        <div className="hk-segment">
          {GENDER_OPTIONS.map((g) => (
            <label key={g.value} className="hk-chip">
              <input type="radio" name="gender" value={g.value} checked={gender === g.value} onChange={() => setGender(g.value)} />
              {g.label}
            </label>
          ))}
        </div>
        {err.gender && <span className="hk-field__error">{err.gender}</span>}
      </fieldset>

      <Field label="CNIC or B-Form (optional)" htmlFor="cnic" error={err.cnic} hint="13 digits. Under 18? Use your B-Form number.">
        <TextInput id="cnic" name="cnic" inputMode="numeric" placeholder="42101-1234567-1" maxLength={15} defaultValue={val("cnic")} />
      </Field>

      <div className="hk-form__row">
        <Field label="Email" htmlFor="email" hint="This is the email you signed in with.">
          <TextInput id="email" value={profile.email} readOnly disabled />
        </Field>
        <Field label="WhatsApp number" htmlFor="phone" error={err.phone}>
          <TextInput id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0300 1234567" defaultValue={val("phone")} required />
        </Field>
      </div>
      <Field label="Date of birth" htmlFor="date_of_birth" error={err.date_of_birth}>
        <TextInput id="date_of_birth" name="date_of_birth" type="date" defaultValue={val("date_of_birth")} required />
      </Field>

      <h2 style={{ fontSize: 20, marginTop: 8 }}>Education and work</h2>
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

      <Field label={studying ? "University or college" : "University or college (optional)"} htmlFor="university" error={err.university}>
        <TextInput id="university" name="university" defaultValue={val("university")} />
      </Field>
      <div className="hk-form__row">
        <Field label="Degree" htmlFor="degree" hint="For example BS Computer Science">
          <TextInput id="degree" name="degree" defaultValue={val("degree")} />
        </Field>
        <Field label="Year" htmlFor="education_year" hint={studying ? "Your current year, for example 3rd year" : "Year you graduated, for example 2019"}>
          <TextInput id="education_year" name="education_year" defaultValue={val("education_year")} />
        </Field>
      </div>
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

      <h2 style={{ fontSize: 20, marginTop: 8 }}>Where in Karachi?</h2>
      <Field label="Area" htmlFor="area" error={err.area}>
        <TextInput id="area" name="area" placeholder="Gulshan, DHA, North Nazimabad..." defaultValue={val("area")} required />
      </Field>
      <Field label="Address (optional)" htmlFor="address_line" hint="Helps us plan events closer to you.">
        <TextInput id="address_line" name="address_line" autoComplete="street-address" defaultValue={val("address_line")} />
      </Field>

      <h2 style={{ fontSize: 20, marginTop: 8 }}>What interests you?</h2>
      <span className="hk-field__hint" style={{ marginTop: -10 }}>Pick up to {MAX_INTERESTS}. {interests.length}/{MAX_INTERESTS} selected.</span>
      <div className="hk-segment">
        {INTEREST_OPTIONS.map((i) => {
          const checked = interests.includes(i);
          return (
            <label key={i} className="hk-chip" style={!checked && full ? { opacity: 0.45, cursor: "not-allowed" } : undefined}>
              <input type="checkbox" name="interests" value={i} checked={checked} disabled={!checked && full} onChange={() => toggleInterest(i)} />{i}
            </label>
          );
        })}
      </div>
      {err.interests && <span className="hk-field__error">{err.interests}</span>}

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
