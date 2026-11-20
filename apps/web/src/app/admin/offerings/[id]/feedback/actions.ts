"use server";

import { revalidatePath } from "next/cache";
import { renderFeedbackEmail } from "@hikmah/emails";
import type { Json } from "@hikmah/db";
import { requireAdmin } from "@/lib/admin";
import { emailLogoUrl, sendEmailBatch } from "@/lib/email";
import { SITE_URL } from "@/lib/env";
import { DEFAULT_FEEDBACK, parseQuestions, slugKey, type FeedbackQuestion } from "@/lib/feedback";
import { fmtDate } from "@/lib/time";

export type FbState = { ok?: boolean; message?: string };

export async function saveFeedbackForm(_prev: FbState, form: FormData): Promise<FbState> {
  const { supabase } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  let qs: FeedbackQuestion[];
  try { qs = parseQuestions(JSON.parse(String(form.get("questions") ?? "[]"))); } catch { return { message: "Could not read the questions." }; }
  const seen = new Set<string>();
  qs = qs.filter((q) => q.label.trim()).slice(0, 20).map((q) => {
    let key = q.key && /^[a-z0-9_]+$/.test(q.key) ? q.key : slugKey(q.label);
    while (seen.has(key)) key = `${key}_2`;
    seen.add(key);
    const options = (q.options ?? []).map((o) => o.trim()).filter(Boolean).slice(0, 15);
    return { key, label: q.label.trim().slice(0, 200), type: q.type, required: !!q.required, ...(q.type === "single" || q.type === "multi" ? { options } : {}) };
  });
  const bad = qs.find((q) => (q.type === "single" || q.type === "multi") && (q.options?.length ?? 0) < 2);
  if (bad) return { message: `"${bad.label}" needs at least 2 choices.` };
  if (!qs.length) return { message: "Add at least one question." };
  const { error } = await supabase.from("feedback_forms").upsert({ offering_id: offeringId, questions: qs as unknown as Json, intro: String(form.get("intro") ?? "").trim().slice(0, 500) || null });
  if (error) return { message: `Could not save: ${error.message}` };
  revalidatePath(`/admin/offerings/${offeringId}/feedback`);
  return { ok: true, message: "Questions saved." };
}

export async function sendFeedbackEmails(_prev: FbState, form: FormData): Promise<FbState> {
  const { supabase, userId } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  const onlyMissing = form.get("audience") === "missing";

  const [{ data: offering }, { data: existing }] = await Promise.all([
    supabase.from("offerings").select("title, starts_at").eq("id", offeringId).single(),
    supabase.from("feedback_forms").select("offering_id, sent_count").eq("offering_id", offeringId).maybeSingle(),
  ]);
  if (!offering) return { message: "Event not found." };
  if (!existing) await supabase.from("feedback_forms").insert({ offering_id: offeringId, questions: DEFAULT_FEEDBACK as unknown as Json });

  const [{ data: regs }, { data: answered }] = await Promise.all([
    supabase.from("registrations").select("id, feedback_token, profiles(full_name, email)").eq("offering_id", offeringId).neq("status", "cancelled"),
    supabase.from("feedback_responses").select("registration_id").eq("offering_id", offeringId),
  ]);
  const done = new Set((answered ?? []).map((a) => a.registration_id));
  type R = { id: string; feedback_token: string; profiles: { full_name: string | null; email: string } | null };
  const recipients = ((regs ?? []) as unknown as R[]).filter((r) => r.profiles?.email && (!onlyMissing || !done.has(r.id)));
  if (!recipients.length) return { message: onlyMissing ? "Everyone who registered has already answered." : "Nobody has registered for this event." };

  const when = offering.starts_at ? fmtDate(offering.starts_at, { weekday: "long", day: "numeric", month: "long" }) : null;
  const emails = await Promise.all(recipients.map(async (r) => ({
    to: r.profiles!.email,
    ...(await renderFeedbackEmail({ firstName: r.profiles!.full_name?.split(" ")[0] || "there", title: offering.title, when, url: `${SITE_URL}/feedback/${r.feedback_token}`, logoUrl: emailLogoUrl })),
  })));
  const sent = await sendEmailBatch(emails);
  await supabase.from("feedback_forms").update({ sent_at: new Date().toISOString(), sent_by: userId, sent_count: (existing?.sent_count ?? 0) + sent, is_open: true }).eq("offering_id", offeringId);
  revalidatePath(`/admin/offerings/${offeringId}/feedback`);
  if (sent === 0) return { message: `Prepared ${recipients.length} emails but none were sent. Check RESEND_API_KEY.` };
  return { ok: true, message: `Sent to ${sent} people.` };
}

export async function toggleFeedbackOpen(form: FormData) {
  const { supabase } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  await supabase.from("feedback_forms").update({ is_open: form.get("open") === "1" }).eq("offering_id", offeringId);
  revalidatePath(`/admin/offerings/${offeringId}/feedback`);
}
