"use client";

import { useActionState, useState } from "react";
import { Button, TextInput } from "@hikmah/ui";
import { Chips, F, Select, SpamGuard, Success, keepValuesOnSubmit } from "@/components/PublicForm";
import { HIFZ } from "@/lib/programs-content";
import type { SubmitResult } from "@/lib/requests";
import { registerForHifz } from "./actions";

function Child({ id, n, errors, onRemove }: { id: number; n: number; errors: Record<string, string>; onRemove?: () => void }) {
  const [inSchool, setInSchool] = useState("");
  const [prior, setPrior] = useState("");
  const k = (f: string) => `c${id}_${f}`;
  return (
    <fieldset className="pg-child" style={{ margin: 0 }}>
      <div className="pg-child__head">
        <h4>Child {n}</h4>
        {onRemove && <button type="button" className="ad-icon-btn ad-icon-btn--danger" onClick={onRemove}>Remove</button>}
      </div>
      <F label="Enrolling for" name={k("track")} error={errors[k("track")]} required><Chips name={k("track")} options={HIFZ.tracks} /></F>
      <div className="hk-form__row">
        <F label="Name of child" name={k("name")} error={errors[k("name")]} required><TextInput id={k("name")} name={k("name")} /></F>
        <F label="Age" name={k("age")} error={errors[k("age")]} required><TextInput id={k("age")} name={k("age")} type="number" min={3} max={18} inputMode="numeric" /></F>
      </div>
      <F label="Gender" name={k("gender")}><Chips name={k("gender")} options={["Male", "Female"]} defaultValue="Male" /></F>
      <F label="Currently enrolled in a school or college?" name={k("in_school")}><Chips name={k("in_school")} options={["Yes", "No"]} onChange={setInSchool} /></F>
      {inSchool === "Yes" && (
        <div className="hk-form__row">
          <F label="School / college name" name={k("school")} error={errors[k("school")]} required><TextInput id={k("school")} name={k("school")} /></F>
          <F label="Current grade / class" name={k("grade")}><TextInput id={k("grade")} name={k("grade")} placeholder="e.g. Class 3" /></F>
        </div>
      )}
      <F label="Has he studied Quran before (Qaida, Nazra, Hifz or Girdaan)?" name={k("prior_study")}><Chips name={k("prior_study")} options={["Yes", "No"]} onChange={setPrior} /></F>
      {prior === "Yes" && (
        <>
          <div className="hk-form__row">
            <F label="Level completed" name={k("level")} error={errors[k("level")]} required><Select name={k("level")} options={HIFZ.levels} /></F>
            <F label="Number of paras memorized" name={k("paras")}><TextInput id={k("paras")} name={k("paras")} type="number" min={0} max={30} inputMode="numeric" /></F>
          </div>
          <F label="Institute / madrassah name" name={k("institute")}><TextInput id={k("institute")} name={k("institute")} /></F>
        </>
      )}
    </fieldset>
  );
}

export function HifzForm() {
  const [state, action, pending] = useActionState<SubmitResult, FormData>(registerForHifz, {});
  const [ids, setIds] = useState<number[]>([1]);
  const e = state.errors ?? {};
  if (state.ok) return <Success title="Registration received" text={`JazakAllah khair. We've received your registration${ids.length > 1 ? ` for ${ids.length} children` : ""}. Our team will contact you about the next steps, in sha Allah.`} />;
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="hk-form" noValidate>
      <SpamGuard />
      <input type="hidden" name="child_ids" value={ids.join(",")} />
      {state.message && <div className="hk-alert hk-alert--error" role="alert">{state.message}</div>}

      <p className="pg-legend">Children</p>
      {e.children && <span className="hk-field__error">{e.children}</span>}
      {ids.map((id, i) => <Child key={id} id={id} n={i + 1} errors={e} onRemove={ids.length > 1 ? () => setIds(ids.filter((x) => x !== id)) : undefined} />)}
      {ids.length < 6 && (
        <button type="button" className="hk-btn hk-btn--ghost" onClick={() => setIds([...ids, Math.max(...ids) + 1])}>+ Add another child</button>
      )}

      <p className="pg-legend">Father / guardian</p>
      <div className="hk-form__row">
        <F label="Name" name="father_name" error={e.father_name} required><TextInput id="father_name" name="father_name" autoComplete="name" /></F>
        <F label="Contact number (WhatsApp preferred)" name="father_phone" error={e.father_phone} required><TextInput id="father_phone" name="father_phone" type="tel" inputMode="tel" placeholder="0300 1234567" /></F>
      </div>
      <F label="Email" name="father_email" error={e.father_email} hint="We send your confirmation here."><TextInput id="father_email" name="father_email" type="email" autoComplete="email" /></F>
      <div className="hk-form__row">
        <F label="Latest qualification" name="father_qualification"><Select name="father_qualification" options={HIFZ.qualifications} /></F>
        <F label="School / college / university" name="father_institution"><TextInput id="father_institution" name="father_institution" /></F>
      </div>

      <p className="pg-legend">Mother / guardian</p>
      <div className="hk-form__row">
        <F label="Name" name="mother_name"><TextInput id="mother_name" name="mother_name" /></F>
        <F label="Contact number (WhatsApp preferred)" name="mother_phone" error={e.mother_phone}><TextInput id="mother_phone" name="mother_phone" type="tel" inputMode="tel" /></F>
      </div>
      <F label="Email" name="mother_email" error={e.mother_email}><TextInput id="mother_email" name="mother_email" type="email" /></F>
      <div className="hk-form__row">
        <F label="Latest qualification" name="mother_qualification"><Select name="mother_qualification" options={HIFZ.qualifications} /></F>
        <F label="School / college / university" name="mother_institution"><TextInput id="mother_institution" name="mother_institution" /></F>
      </div>

      <p className="pg-legend">Home address</p>
      <F label="Address" name="address" error={e.address} required><TextInput id="address" name="address" autoComplete="street-address" /></F>
      <div className="hk-form__row">
        <F label="Area" name="area" error={e.area} required><TextInput id="area" name="area" placeholder="e.g. PECHS" /></F>
        <F label="City" name="city" required><TextInput id="city" name="city" defaultValue="Karachi" /></F>
      </div>
      <input type="hidden" name="country" value="Pakistan" />

      <Button type="submit" block disabled={pending}>{pending ? "Sending…" : ids.length > 1 ? `Register ${ids.length} children` : "Register"}</Button>
    </form>
  );
}
