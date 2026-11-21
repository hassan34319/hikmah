"use server";

import { revalidatePath } from "next/cache";
import { renderAdmissionEmail } from "@hikmah/emails";
import type { Json, TestItem } from "@hikmah/db";
import { emailLogoUrl, sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/time";

const ERR: Record<string, string> = {
  not_found: "This link isn't for the account you're signed in with.",
  not_invited: "This step isn't open for you right now.",
  slot_full: "Someone just took that time. Please pick another.",
  slot_unavailable: "That time is no longer available.",
  pledge_required: "Please tick the pledge to submit.",
  essay_too_short: "Please write a little more (at least a few sentences).",
};
const msg = (e: { message: string } | null) => (e ? ERR[e.message] ?? e.message : null);

export async function startTest(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admission_test_start", { p_token: token });
  return { error: msg(error) };
}

export async function nextItem(token: string): Promise<{ item: TestItem | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admission_test_next", { p_token: token });
  return { item: (data ?? [])[0] ?? null, error: msg(error) };
}

export async function answerItem(token: string, itemId: string, response: Json) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admission_test_answer", { p_token: token, p_item: itemId, p_response: response });
  return { correct: data?.[0]?.correct ?? false, points: data?.[0]?.points ?? 0, error: msg(error) };
}

export async function flagLeave(token: string) {
  const supabase = await createClient();
  await supabase.rpc("admission_test_flag", { p_token: token });
}

export async function submitTest(token: string, essay: string, pledge: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admission_test_submit", { p_token: token, p_essay: essay, p_pledge: pledge });
  if (!error) revalidatePath(`/admissions/${token}`);
  return { error: msg(error) };
}

export type BookState = { ok?: boolean; message?: string };

export async function bookSlot(_p: BookState, form: FormData): Promise<BookState> {
  const supabase = await createClient();
  const token = String(form.get("token")); const slot = String(form.get("slot") ?? "");
  if (!slot) return { message: "Pick a time first." };
  const { data: when, error } = await supabase.rpc("interview_book", { p_token: token, p_slot: slot });
  if (error) return { message: msg(error) ?? "Could not book." };
  const [{ data: { user } }, { data: info }] = await Promise.all([supabase.auth.getUser(), supabase.rpc("admission_test_info", { p_token: token })]);
  const { data: slots } = await supabase.rpc("interview_slots_for", { p_token: token });
  const venue = (slots ?? []).find((s) => s.slot_id === slot)?.venue ?? null;
  if (user?.email) {
    const whenText = fmtDate(when as string, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
    await sendEmail({ to: user.email, ...(await renderAdmissionEmail({ kind: "booked", course: info?.[0]?.course ?? "your course", firstName: info?.[0]?.first_name || "there", when: whenText, where: venue, url: `${SITE_URL}/admissions/${token}`, logoUrl: emailLogoUrl })) });
  }
  revalidatePath(`/admissions/${token}`);
  return { ok: true, message: "Booked. We've emailed you the details." };
}
