"use client";

import { useActionState } from "react";
import { Button, Field, TextInput } from "@hikmah/ui";
import { sendCode, verifyCode, type SignInState } from "./actions";

export function SignInForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const [sendState, send, sending] = useActionState<SignInState, FormData>(sendCode, { step: "email" });
  const [verifyState, verify, verifying] = useActionState<SignInState, FormData>(verifyCode, { step: "code" });

  const onCodeStep = sendState.step === "code";
  const email = sendState.email ?? "";
  const error = onCodeStep ? (verifyState.error ?? undefined) : sendState.error;

  if (!onCodeStep) {
    return (
      <form action={send} className="hk-form">
        {linkError && !error && <div className="hk-alert hk-alert--error">That sign in link has expired or was opened in a different browser. Ask for a new one below.</div>}
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="email" error={error} hint="New here? The same code creates your account.">
          <TextInput id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={email} />
        </Field>
        <Button type="submit" block disabled={sending}>{sending ? "Sending code..." : "Send me a code"}</Button>
      </form>
    );
  }

  return (
    <div className="hk-form">
      {sendState.info && !error && <div className="hk-alert hk-alert--info">{sendState.info}</div>}
      <form action={verify} className="hk-form">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <Field label="Code from your email" htmlFor="code" error={error}>
          <TextInput id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" maxLength={12} required autoFocus
            style={{ fontSize: 22, letterSpacing: "0.4em", textAlign: "center" }} />
        </Field>
        <Button type="submit" block disabled={verifying}>{verifying ? "Checking..." : "Sign in"}</Button>
      </form>
      <form action={send}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="ghost" block disabled={sending}>{sending ? "Sending..." : "Resend code"}</Button>
      </form>
    </div>
  );
}
