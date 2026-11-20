"use client";

import { startTransition, useEffect, useState, type FormEvent, type ReactNode } from "react";

/** Hidden trap for bots plus a start time; checked on the server by looksLikeBot(). */
export function SpamGuard() {
  const [t, setT] = useState("");
  useEffect(() => setT(String(Date.now())), []);
  return (
    <>
      <input type="hidden" name="started_at" value={t} />
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
    </>
  );
}

export function F({ label, name, error, hint, required, children }: { label: string; name: string; error?: string; hint?: string; required?: boolean; children?: ReactNode }) {
  return (
    <div className="hk-field">
      <label className="hk-field__label" htmlFor={name}>{label}{!required && <span style={{ color: "var(--hk-muted)", fontWeight: 400 }}> (optional)</span>}</label>
      {children}
      {hint && !error && <span className="hk-field__hint">{hint}</span>}
      {error && <span className="hk-field__error" role="alert">{error}</span>}
    </div>
  );
}

export function Select({ name, options, placeholder = "Choose one", defaultValue, onChange }: { name: string; options: string[]; placeholder?: string; defaultValue?: string; onChange?: (v: string) => void }) {
  return (
    <select id={name} name={name} className="hk-input" defaultValue={defaultValue ?? ""} onChange={(e) => onChange?.(e.target.value)}>
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

export function Chips({ name, options, defaultValue, onChange }: { name: string; options: string[]; defaultValue?: string; onChange?: (v: string) => void }) {
  return (
    <div className="hk-segment" role="radiogroup">
      {options.map((o) => (
        <label key={o} className="hk-chip"><input type="radio" name={name} value={o} defaultChecked={defaultValue === o} onChange={() => onChange?.(o)} />{o}</label>
      ))}
    </div>
  );
}

export function Success({ title, text }: { title: string; text: string }) {
  return (
    <div className="pg-success" role="status">
      <span aria-hidden="true">✓</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

/**
 * React clears a <form action={...}> after every submit, which wipes what people typed when we show errors.
 * Submitting through onSubmit keeps their answers on screen.
 */
export function keepValuesOnSubmit(dispatch: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
}
