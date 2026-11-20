"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, TextInput } from "@hikmah/ui";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import type { FormFieldDef } from "@/lib/forms";
import { register, type RegisterState } from "./actions";

export function RegisterForm({ slug, questions, submitLabel, note }: {
  slug: string; questions: FormFieldDef[]; submitLabel: string; note: string;
}) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, {});
  const err = state.errors ?? {};

  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="hk-form" noValidate>
      <input type="hidden" name="slug" value={slug} />
      {state.message && (
        <div className="hk-alert hk-alert--error" role="alert">
          {state.message} {state.message.includes("already") && <Link href="/account">See my registrations</Link>}
        </div>
      )}
      {Object.entries(err).filter(([k]) => !questions.some((q) => q.key === k)).map(([k, m]) => (
        <div key={k} className="hk-alert hk-alert--error">{m} <Link href={`/complete-profile?next=/register/${slug}`}>Edit details</Link></div>
      ))}

      {questions.map((q) => {
        const label = q.required ? q.label : `${q.label} (optional)`;
        const id = `q_${q.key}`;
        if (q.type === "single_select" || q.type === "multi_select") {
          const multi = q.type === "multi_select";
          return (
            <fieldset key={q.key} style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="hk-field__label" style={{ marginBottom: 8 }}>{label}</legend>
              {q.help && <span className="hk-field__hint" style={{ display: "block", marginBottom: 8 }}>{q.help}</span>}
              <div className="hk-segment">
                {q.options.map((opt) => (
                  <label key={opt} className="hk-chip">
                    <input type={multi ? "checkbox" : "radio"} name={q.key} value={opt} />{opt}
                  </label>
                ))}
              </div>
              {err[q.key] && <span className="hk-field__error">{err[q.key]}</span>}
            </fieldset>
          );
        }
        if (q.type === "checkbox") {
          return (
            <div key={q.key}>
              <label className="hk-check"><input type="checkbox" name={q.key} />{label}</label>
              {err[q.key] && <span className="hk-field__error">{err[q.key]}</span>}
            </div>
          );
        }
        if (q.type === "file") {
          return <p key={q.key} className="hk-field__hint">[File upload questions are coming soon: {q.label}]</p>;
        }
        const inputType = { email: "email", phone: "tel", number: "number", date: "date", url: "url" }[q.type as string] ?? "text";
        return (
          <Field key={q.key} label={label} htmlFor={id} hint={q.help ?? undefined} error={err[q.key]}>
            {q.type === "long_text"
              ? <textarea id={id} name={q.key} className="hk-input" rows={5} placeholder={q.placeholder ?? undefined} />
              : <TextInput id={id} name={q.key} type={inputType} placeholder={q.placeholder ?? undefined} />}
          </Field>
        );
      })}

      <Button type="submit" block disabled={pending}>{pending ? "Submitting..." : submitLabel}</Button>
      <p className="hk-field__hint" style={{ margin: 0, textAlign: "center" }}>{note}</p>
    </form>
  );
}
