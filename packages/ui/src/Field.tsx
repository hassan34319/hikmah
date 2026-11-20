import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({ label, hint, error, htmlFor, children }: {
  label: string; hint?: string; error?: string; htmlFor?: string; children: ReactNode;
}) {
  return (
    <div className="hk-field">
      <label className="hk-field__label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <span className="hk-field__hint">{hint}</span>}
      {error && <span className="hk-field__error" role="alert">{error}</span>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={["hk-input", props.className].filter(Boolean).join(" ")} />;
}
