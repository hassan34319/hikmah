"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json, LmsFile, LmsLink, LmsPostKind } from "@hikmah/db";
import { errText } from "@/lib/lms";
import { notifyStudents, requireTeacher, type Scope } from "@/lib/lms-server";
import { fmtDate, fromPktInput } from "@/lib/time";

export type TeachState = { ok?: boolean; message?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function parseFiles(f: FormData): LmsFile[] {
  try {
    const v = JSON.parse(str(f, "files") || "[]") as LmsFile[];
    return Array.isArray(v) ? v.filter((x) => typeof x.path === "string" && /^c\//.test(x.path)).map((x) => ({ path: x.path, name: String(x.name).slice(0, 200), size: Number(x.size) || 0 })) : [];
  } catch { return []; }
}

/** One link per line: "https://..." or "Label | https://..." */
function parseLinks(f: FormData): LmsLink[] {
  return str(f, "links").split("\n").map((l) => l.trim()).filter(Boolean).flatMap((line) => {
    const [a, b] = line.includes("|") ? line.split("|").map((x) => x.trim()) : [line, line];
    const url = (b ?? a ?? "").trim();
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try { new URL(withScheme); } catch { return []; }
    return [{ url: withScheme, label: (line.includes("|") ? a : "") || withScheme.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60) }];
  }).slice(0, 20);
}

/** Validates the chosen course subject and sections against what this teacher teaches. */
function pickScope(scopes: Scope[], f: FormData) {
  const [offeringId, subjectId] = str(f, "scope").split("|");
  const scope = scopes.find((s) => s.offeringId === offeringId && s.subjectId === subjectId);
  if (!scope) return { error: "Choose the course and subject." } as const;
  const sections = f.getAll("section").map(String).filter((id) => scope.sections.some((s) => s.id === id));
  if (!sections.length) return { error: "Tick at least one section." } as const;
  return { scope, sections } as const;
}

async function setTargets(supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"], table: "lms_post_sections" | "lms_assignment_sections" | "lms_quiz_sections", key: "post_id" | "assignment_id" | "quiz_id", id: string, sections: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from(table) as any).delete().eq(key, id);
  const rows = sections.map((section_id) => ({ [key]: id, section_id }));
  // Rows for sections this teacher doesn't teach can't be deleted above (RLS), so skip duplicates.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from(table).upsert(rows as any, { onConflict: `${key},section_id`, ignoreDuplicates: true });
  return error;
}

// ---- Materials and announcements ---------------------------------------------
export async function savePost(_p: TeachState, f: FormData): Promise<TeachState> {
  const { supabase, scopes, name } = await requireTeacher();
  const picked = pickScope(scopes, f);
  if ("error" in picked) return { message: picked.error };
  const { scope, sections } = picked;
  const kind = (str(f, "kind") === "announcement" ? "announcement" : "material") as LmsPostKind;
  const title = str(f, "title");
  if (!title) return { message: "Give it a title." };
  const files = parseFiles(f); const links = parseLinks(f);
  const body = str(f, "body") || null;
  if (kind === "material" && !files.length && !links.length && !body) return { message: "Add a file, a link or some notes." };
  const row = { offering_id: scope.offeringId, subject_id: scope.subjectId, kind, title, topic: str(f, "topic") || null, body, files: files as unknown as Json, links: links as unknown as Json };
  const id = str(f, "id");
  let postId = id;
  if (id) {
    const { error } = await supabase.from("lms_posts").update(row).eq("id", id);
    if (error) return { message: errText(error.message) };
  } else {
    const { data, error } = await supabase.from("lms_posts").insert(row).select("id").single();
    if (error || !data) return { message: errText(error?.message ?? "Could not save.") };
    postId = data.id;
  }
  const err = await setTargets(supabase, "lms_post_sections", "post_id", postId, sections);
  if (err) return { message: errText(err.message) };
  if (f.get("notify") === "on") {
    await notifyStudents(supabase, { sections, kind, course: scope.course, subject: scope.subject, title, body: kind === "announcement" ? body : (body ?? (files.length ? `${files.length} file${files.length > 1 ? "s" : ""} attached.` : null)), teacher: name, path: `/learn/materials/${postId}` });
  }
  revalidatePath("/teach/materials"); revalidatePath("/learn");
  redirect(`/teach/materials?saved=${kind}`);
}

export async function deletePost(f: FormData) {
  const { supabase } = await requireTeacher();
  const { data } = await supabase.from("lms_posts").select("files").eq("id", str(f, "id")).maybeSingle();
  const paths = Array.isArray(data?.files) ? (data!.files as unknown as LmsFile[]).map((x) => x.path) : [];
  await supabase.from("lms_posts").delete().eq("id", str(f, "id"));
  if (paths.length) await supabase.storage.from("lms").remove(paths);
  revalidatePath("/teach/materials");
  redirect("/teach/materials");
}

// ---- Assignments ---------------------------------------------------------------
export async function saveAssignment(_p: TeachState, f: FormData): Promise<TeachState> {
  const { supabase, scopes, name } = await requireTeacher();
  const picked = pickScope(scopes, f);
  if ("error" in picked) return { message: picked.error };
  const { scope, sections } = picked;
  const title = str(f, "title");
  const due = fromPktInput(f.get("due_at"));
  const max = Number(str(f, "max_marks"));
  if (!title) return { message: "Give the assignment a title." };
  if (!due) return { message: "Set the due date and time." };
  if (!(max > 0 && max <= 1000)) return { message: "Total marks must be between 1 and 1000." };
  const files = parseFiles(f);
  const instructions = str(f, "instructions") || null;
  const row = { offering_id: scope.offeringId, subject_id: scope.subjectId, title, instructions, files: files as unknown as Json, due_at: due, max_marks: max, allow_late: f.get("allow_late") === "on" };
  const id = str(f, "id");
  let aid = id;
  if (id) {
    const { error } = await supabase.from("lms_assignments").update(row).eq("id", id);
    if (error) return { message: errText(error.message) };
  } else {
    const { data, error } = await supabase.from("lms_assignments").insert(row).select("id").single();
    if (error || !data) return { message: errText(error?.message ?? "Could not save.") };
    aid = data.id;
  }
  const err = await setTargets(supabase, "lms_assignment_sections", "assignment_id", aid, sections);
  if (err) return { message: errText(err.message) };
  if (f.get("notify") === "on") {
    await notifyStudents(supabase, { sections, kind: "assignment", course: scope.course, subject: scope.subject, title, body: instructions, when: fmtDate(due, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }), teacher: name, path: `/learn/assignments/${aid}` });
  }
  revalidatePath("/teach/assignments");
  redirect(`/teach/assignments/${aid}?saved=1`);
}

export async function deleteAssignment(f: FormData) {
  const { supabase } = await requireTeacher();
  await supabase.from("lms_assignments").delete().eq("id", str(f, "id"));
  revalidatePath("/teach/assignments");
  redirect("/teach/assignments");
}

export async function markSubmission(_p: TeachState, f: FormData): Promise<TeachState> {
  const { supabase } = await requireTeacher();
  const raw = str(f, "marks");
  const marks = raw === "" ? null : Number(raw);
  if (marks !== null && !(marks >= 0)) return { message: "Marks must be a number." };
  const { error } = await supabase.from("lms_submissions").update({ marks, feedback: str(f, "feedback") || null }).eq("id", str(f, "submission_id"));
  if (error) return { message: errText(error.message) };
  revalidatePath(`/teach/assignments/${str(f, "assignment_id")}`);
  return { ok: true, message: marks === null ? "Feedback saved." : `Saved ${marks}.` };
}

// ---- Quizzes ---------------------------------------------------------------------
export async function saveQuiz(_p: TeachState, f: FormData): Promise<TeachState> {
  const { supabase, scopes } = await requireTeacher();
  const picked = pickScope(scopes, f);
  if ("error" in picked) return { message: picked.error };
  const { scope, sections } = picked;
  const title = str(f, "title");
  if (!title) return { message: "Give the quiz a title." };
  const limit = str(f, "time_limit_min") ? Number(str(f, "time_limit_min")) : null;
  if (limit !== null && !(limit >= 1 && limit <= 600)) return { message: "Time limit must be between 1 and 600 minutes, or empty for none." };
  const opens = fromPktInput(f.get("opens_at")); const closes = fromPktInput(f.get("closes_at"));
  if (opens && closes && closes <= opens) return { message: "The closing time must be after the opening time." };
  const row = { offering_id: scope.offeringId, subject_id: scope.subjectId, title, instructions: str(f, "instructions") || null, opens_at: opens, closes_at: closes, time_limit_min: limit, shuffle: f.get("shuffle") === "on", show_answers: f.get("show_answers") === "on" };
  const id = str(f, "id");
  let qid = id;
  if (id) {
    const { error } = await supabase.from("lms_quizzes").update(row).eq("id", id);
    if (error) return { message: errText(error.message) };
  } else {
    const { data, error } = await supabase.from("lms_quizzes").insert(row).select("id").single();
    if (error || !data) return { message: errText(error?.message ?? "Could not save.") };
    qid = data.id;
  }
  const err = await setTargets(supabase, "lms_quiz_sections", "quiz_id", qid, sections);
  if (err) return { message: errText(err.message) };
  revalidatePath(`/teach/quizzes/${qid}`);
  if (!id) redirect(`/teach/quizzes/${qid}`);
  return { ok: true, message: "Quiz settings saved." };
}

export async function saveQuestion(_p: TeachState, f: FormData): Promise<TeachState> {
  const { supabase } = await requireTeacher();
  const quizId = str(f, "quiz_id"); const qid = str(f, "question_id");
  const kind: "mcq" | "short" = str(f, "kind") === "short" ? "short" : "mcq";
  const prompt = str(f, "prompt");
  const points = Number(str(f, "points") || "1");
  if (!prompt) return { message: "Write the question." };
  if (!(points > 0 && points <= 100)) return { message: "Points must be between 0.5 and 100." };
  const options = kind === "mcq" ? f.getAll("option").map((o) => String(o).trim()) : [];
  const filled = options.filter(Boolean);
  const correctRaw = str(f, "correct");
  let correct: number | null = null;
  if (kind === "mcq") {
    if (filled.length < 2) return { message: "Give at least two options." };
    const idx = Number(correctRaw);
    if (correctRaw === "" || !options[idx]) return { message: "Tick the correct option." };
    correct = filled.indexOf(options[idx]!);
  }
  const { count } = await supabase.from("lms_quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  const row = { quiz_id: quizId, kind, prompt, options: filled as unknown as Json, points };
  let id = qid;
  if (qid) {
    const { error } = await supabase.from("lms_quiz_questions").update(row).eq("id", qid);
    if (error) return { message: errText(error.message) };
  } else {
    const { data, error } = await supabase.from("lms_quiz_questions").insert({ ...row, pos: (count ?? 0) + 1 }).select("id").single();
    if (error || !data) return { message: errText(error?.message ?? "Could not save.") };
    id = data.id;
  }
  const { error } = await supabase.from("lms_quiz_keys").upsert({ question_id: id, correct, model_answer: kind === "short" ? str(f, "model_answer") || null : null });
  if (error) return { message: errText(error.message) };
  revalidatePath(`/teach/quizzes/${quizId}`);
  return { ok: true, message: qid ? "Question updated." : "Question added." };
}

export async function deleteQuestion(f: FormData) {
  const { supabase } = await requireTeacher();
  await supabase.from("lms_quiz_questions").delete().eq("id", str(f, "question_id"));
  const { data } = await supabase.from("lms_quiz_questions").select("id").eq("quiz_id", str(f, "quiz_id")).order("pos");
  for (const [i, q] of (data ?? []).entries()) await supabase.from("lms_quiz_questions").update({ pos: i + 1 }).eq("id", q.id);
  revalidatePath(`/teach/quizzes/${str(f, "quiz_id")}`);
}

export async function moveQuestion(f: FormData) {
  const { supabase } = await requireTeacher();
  const quizId = str(f, "quiz_id"); const id = str(f, "question_id"); const dir = str(f, "dir") === "up" ? -1 : 1;
  const { data } = await supabase.from("lms_quiz_questions").select("id").eq("quiz_id", quizId).order("pos");
  const list = (data ?? []).map((q) => q.id);
  const i = list.indexOf(id); const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
  for (const [k, qid] of list.entries()) await supabase.from("lms_quiz_questions").update({ pos: k + 1 }).eq("id", qid);
  revalidatePath(`/teach/quizzes/${quizId}`);
}

export async function publishQuiz(_p: TeachState, f: FormData): Promise<TeachState> {
  const { supabase, name } = await requireTeacher();
  const quizId = str(f, "quiz_id"); const publish = str(f, "publish") === "1";
  if (publish) {
    const { count } = await supabase.from("lms_quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
    if (!count) return { message: "Add at least one question before publishing." };
    const { data: keys } = await supabase.from("lms_quiz_questions").select("id, kind, lms_quiz_keys(correct)").eq("quiz_id", quizId);
    const missing = ((keys ?? []) as unknown as { kind: string; lms_quiz_keys: { correct: number | null } | null }[]).filter((q) => q.kind === "mcq" && q.lms_quiz_keys?.correct == null).length;
    if (missing) return { message: `${missing} multiple-choice ${missing === 1 ? "question has" : "questions have"} no correct answer ticked.` };
  }
  const { data: quiz, error } = await supabase.from("lms_quizzes").update({ published: publish }).eq("id", quizId).select("title, closes_at, offering_id, subject_id, offerings(title), lms_subjects(name)").single();
  if (error || !quiz) return { message: errText(error?.message ?? "Could not save.") };
  if (publish && f.get("notify") === "on") {
    const { data: secs } = await supabase.from("lms_quiz_sections").select("section_id").eq("quiz_id", quizId);
    const q = quiz as unknown as { title: string; closes_at: string | null; offerings: { title: string } | null; lms_subjects: { name: string } | null };
    await notifyStudents(supabase, { sections: (secs ?? []).map((s) => s.section_id), kind: "quiz", course: q.offerings?.title ?? "", subject: q.lms_subjects?.name, title: q.title, when: q.closes_at ? fmtDate(q.closes_at, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) : null, teacher: name, path: `/learn/quizzes/${quizId}` });
  }
  revalidatePath(`/teach/quizzes/${quizId}`); revalidatePath("/teach/quizzes");
  return { ok: true, message: publish ? "Published. Students in the chosen sections can see it now." : "Unpublished. Students can no longer see it." };
}

export async function deleteQuiz(f: FormData) {
  const { supabase } = await requireTeacher();
  await supabase.from("lms_quizzes").delete().eq("id", str(f, "quiz_id"));
  revalidatePath("/teach/quizzes");
  redirect("/teach/quizzes");
}

export async function markAnswer(_p: TeachState, f: FormData): Promise<TeachState> {
  const { supabase } = await requireTeacher();
  const attempt = str(f, "attempt_id");
  for (const [k, v] of f.entries()) {
    if (!k.startsWith("pts_") || String(v).trim() === "") continue;
    const { error } = await supabase.rpc("lms_quiz_mark", { p_attempt: attempt, p_question: k.slice(4), p_points: Number(v) });
    if (error) return { message: errText(error.message) };
  }
  if (f.has("feedback")) {
    const { error } = await supabase.rpc("lms_quiz_feedback", { p_attempt: attempt, p_feedback: str(f, "feedback") });
    if (error) return { message: errText(error.message) };
  }
  revalidatePath(`/teach/quizzes/${str(f, "quiz_id")}`);
  return { ok: true, message: "Marks saved." };
}
