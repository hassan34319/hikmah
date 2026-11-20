"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseConfigured } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { step: "email" | "code"; email?: string; error?: string; info?: string };

const emailSchema = z.string().trim().toLowerCase().email("Please enter a valid email address.");
const codeSchema = z.string().trim().regex(/^\d{6}$/, "The code is 6 digits.");

export async function sendCode(_prev: SignInState, form: FormData): Promise<SignInState> {
  if (!supabaseConfigured) return { step: "email", error: "Supabase is not connected yet." };
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { step: "email", error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: true } });
  if (error) return { step: "email", email: parsed.data, error: friendly(error.message) };
  return { step: "code", email: parsed.data, info: `We sent a 6 digit code to ${parsed.data}.` };
}

export async function verifyCode(prev: SignInState, form: FormData): Promise<SignInState> {
  const email = emailSchema.safeParse(form.get("email"));
  const code = codeSchema.safeParse(form.get("code"));
  if (!email.success) return { step: "email", error: "Please start again with your email." };
  if (!code.success) return { ...prev, step: "code", email: email.data, error: code.error.issues[0]?.message, info: undefined };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: email.data, token: code.data, type: "email" });
  if (error || !data.user) return { step: "code", email: email.data, error: "That code is wrong or has expired. Try again or resend." };

  const { data: profile } = await supabase
    .from("profiles").select("profile_completed_at").eq("id", data.user.id).maybeSingle();
  const next = safeNext(form.get("next"));
  redirect(profile?.profile_completed_at ? next : `/complete-profile?next=${encodeURIComponent(next)}`);
}

function friendly(message: string) {
  if (/rate|seconds/i.test(message)) return "Please wait a minute before asking for another code.";
  return "We could not send the code. Please try again.";
}
