"use server";

import { redirect } from "next/navigation";
import { profileFromForm, profileSchema } from "@/lib/profile-schema";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { errors?: Record<string, string>; message?: string; values?: Record<string, unknown> };

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const raw = profileFromForm(form);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors, message: "Please fix the highlighted fields.", values: raw };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/complete-profile");

  const v = parsed.data;
  const working = v.occupation_type === "professional" || v.occupation_type === "both";

  const { error } = await supabase.from("profiles").update({
    full_name: v.full_name,
    gender: v.gender,
    cnic: v.cnic,
    phone: v.phone,
    date_of_birth: v.date_of_birth,
    occupation_type: v.occupation_type,
    university: v.university,
    degree: v.degree,
    education_year: v.education_year,
    company: working ? v.company : null,
    job_title: working ? v.job_title : null,
    address_line: v.address_line,
    area: v.area,
    interests: v.interests,
    heard_from: v.heard_from,
    email_opt_in: v.email_opt_in,
    whatsapp_opt_in: v.whatsapp_opt_in,
    profile_completed_at: new Date().toISOString(),
  }).eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      const field = error.message.includes("cnic") ? "cnic" : "phone";
      const msg = field === "cnic" ? "This CNIC is already linked to another account." : "This WhatsApp number is already linked to another account.";
      return { errors: { [field]: msg }, message: "Please fix the highlighted fields.", values: raw };
    }
    console.error("saveProfile", error.message);
    return { message: "We could not save your profile. Please try again.", values: raw };
  }

  redirect(safeNext(form.get("next"), "/account"));
}
