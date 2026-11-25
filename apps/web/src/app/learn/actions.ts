"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json, LmsFile } from "@hikmah/db";
import { errText } from "@/lib/lms";
import { createClient } from "@/lib/supabase/server";

export type LearnState = { ok?: boolean; message?: string };
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function submitAssignment(_p: LearnState, f: FormData): Promise<LearnState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "Please sign in again." };
  const assignmentId = str(f, "assignment_id");
  let files: LmsFile[] = [];
  try {
    const v = JSON.parse(str(f, "files") || "[]") as LmsFile[];
    files = (Array.isArray(v) ? v : []).filter((x) => typeof x.path === "string" && x.path.startsWith(`s/${assignmentId}/${user.id}/`)).map((x) => ({ path: x.path, name: String(x.name).slice(0, 200), size: Number(x.size) || 0 }));
  } catch { /* ignore */ }
  const body = str(f, "body") || null;
  if (!body && !files.length) return { message: "Type your answer or attach a file first." };
  const { data: existing } = await supabase.from("lms_submissions").select("id, files").eq("assignment_id", assignmentId).eq("user_id", user.id).maybeSingle();
  const row = { body, files: files as unknown as Json };
  const { error } = existing
    ? await supabase.from("lms_submissions").update(row).eq("id", existing.id)
    : await supabase.from("lms_submissions").insert({ assignment_id: assignmentId, ...row });
  if (error) return { message: errText(error.message) };
  // Tidy up files removed from a resubmission.
  const removed = (Array.isArray(existing?.files) ? (existing!.files as unknown as LmsFile[]) : []).map((x) => x.path).filter((p) => !files.some((x) => x.path === p));
  if (removed.length) await supabase.storage.from("lms").remove(removed);
  revalidatePath(`/learn/assignments/${assignmentId}`); revalidatePath("/learn");
  return { ok: true, message: existing ? "Your work was updated." : "Handed in. JazakAllah khair!" };
}

export async function withdrawSubmission(f: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const assignmentId = str(f, "assignment_id");
  const { data } = await supabase.from("lms_submissions").delete().eq("assignment_id", assignmentId).eq("user_id", user.id).is("marked_at", null).select("files");
  const paths = (data ?? []).flatMap((s) => (Array.isArray(s.files) ? (s.files as unknown as LmsFile[]).map((x) => x.path) : []));
  if (paths.length) await supabase.storage.from("lms").remove(paths);
  revalidatePath(`/learn/assignments/${assignmentId}`);
}

export async function startQuiz(f: FormData) {
  const supabase = await createClient();
  const quizId = str(f, "quiz_id");
  const { error } = await supabase.rpc("lms_quiz_start", { p_quiz: quizId });
  if (error) redirect(`/learn/quizzes/${quizId}?e=${encodeURIComponent(error.message)}`);
  redirect(`/learn/quizzes/${quizId}`);
}

export async function saveAnswer(attemptId: string, questionId: string, choice: number | null, answer: string | null): Promise<LearnState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("lms_quiz_save", { p_attempt: attemptId, p_question: questionId, p_choice: choice, p_answer: answer });
  return error ? { message: errText(error.message) } : { ok: true };
}

export async function submitQuiz(attemptId: string, quizId: string) {
  const supabase = await createClient();
  await supabase.rpc("lms_quiz_submit", { p_attempt: attemptId });
  revalidatePath(`/learn/quizzes/${quizId}`); revalidatePath("/learn");
  redirect(`/learn/quizzes/${quizId}?done=1`);
}
