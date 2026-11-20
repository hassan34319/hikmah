"use server";

import { redirect } from "next/navigation";
import type { Json } from "@hikmah/db";
import { collectAnswers, toFieldDefs } from "@/lib/forms";
import { sendRegistrationEmail } from "@/lib/registration";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = { errors?: Record<string, string>; message?: string };

const MESSAGES: Record<string, string> = {
  not_open: "Registration for this is closed.",
  already_registered: "You're already registered for this.",
  not_signed_in: "Please sign in again.",
};

export async function register(_prev: RegisterState, form: FormData): Promise<RegisterState> {
  const slug = String(form.get("slug") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/register/${slug}`);

  const [{ data: profile }, { data: offering }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("offerings")
      .select("id, slug, title, subtitle, speaker, starts_at, ends_at, is_online, location_text, qr_tickets_enabled, offering_types(kind), venues(name, address, map_url), form_fields(position, required, label_override, help_override, fields(key, label, type, options, help_text, placeholder, profile_column))")
      .eq("slug", slug).maybeSingle(),
  ]);
  if (!profile || !offering) return { message: "This page is no longer available." };

  const o = offering as unknown as Parameters<typeof sendRegistrationEmail>[0]["offering"] & { form_fields: Parameters<typeof toFieldDefs>[0] };
  const { answers, errors } = collectAnswers(toFieldDefs(o.form_fields), form, profile);
  if (Object.keys(errors).length) return { errors, message: "Please check the highlighted questions." };

  const { data: registration, error } = await supabase.rpc("register_for_offering", { p_slug: slug, p_answers: answers as Json });
  if (error || !registration) {
    const key = Object.keys(MESSAGES).find((k) => error?.message.includes(k));
    if (!key) console.error("register_for_offering", error?.message);
    return { message: key ? MESSAGES[key] : "Something went wrong. Please try again." };
  }

  await sendRegistrationEmail({ to: profile.email, fullName: profile.full_name, offering: o, registration });
  redirect(`/account/registrations/${registration.id}?new=1`);
}
