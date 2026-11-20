"use server";

import type { Json } from "@hikmah/db";
import { checkAnswers, parseQuestions } from "@/lib/feedback";
import { publicClient } from "@/lib/supabase/public";

export type FeedbackState = { ok?: boolean; message?: string; errors?: Record<string, string> };

export async function sendFeedback(_prev: FeedbackState, form: FormData): Promise<FeedbackState> {
  const token = String(form.get("token") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { message: "This feedback link is not valid." };
  const supabase = publicClient();
  const { data } = await supabase.rpc("feedback_form_for", { p_token: token });
  const f = data?.[0];
  if (!f) return { message: "This feedback link is not valid." };
  if (!f.is_open) return { message: "Feedback for this event is closed." };
  const { answers, errors } = checkAnswers(parseQuestions(f.questions), form);
  if (Object.keys(errors).length) return { errors, message: "Please answer the highlighted questions." };
  const { error } = await supabase.rpc("submit_feedback", { p_token: token, p_answers: answers as Json, p_anonymous: form.get("anonymous") === "on" });
  if (error) return { message: error.message.includes("closed") ? "Feedback for this event is closed." : "Could not save. Please try again." };
  return { ok: true };
}
