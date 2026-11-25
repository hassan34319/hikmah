"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { errText } from "@/lib/lms";

export type LmsState = { ok?: boolean; message?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const done = (offeringId: string, message: string): LmsState => {
  revalidatePath(`/admin/lms/${offeringId}`);
  return { ok: true, message };
};
const fail = (e: { message: string; code?: string } | null, fallback = "Could not save.") =>
  ({ message: e?.code === "23505" ? "That name is already used." : e ? errText(e.message) : fallback });

// ---- Sections --------------------------------------------------------------
export async function addSection(_p: LmsState, f: FormData): Promise<LmsState> {
  const { supabase } = await requireAdmin();
  const offeringId = str(f, "offering_id"); const name = str(f, "name");
  const year = Number(str(f, "year"));
  if (!name) return { message: "Give the section a name, e.g. Weekend Morning." };
  if (!(year > 2000 && year < 2100)) return { message: "Choose the intake year." };
  const { count } = await supabase.from("lms_sections").select("id", { count: "exact", head: true }).eq("offering_id", offeringId).eq("intake_year", year);
  const { error } = await supabase.from("lms_sections").insert({ offering_id: offeringId, intake_year: year, name, venue_id: str(f, "venue_id") || null, sort: count ?? 0 });
  if (error) return fail(error);
  return done(offeringId, `Added ${name}.`);
}

export async function updateSection(f: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(f, "name");
  if (!name) return;
  await supabase.from("lms_sections").update({ name, venue_id: str(f, "venue_id") || null }).eq("id", str(f, "section_id"));
  revalidatePath(`/admin/lms/${str(f, "offering_id")}`);
}

export async function archiveSection(f: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("lms_sections").update({ archived: f.get("archived") === "1" }).eq("id", str(f, "section_id"));
  revalidatePath(`/admin/lms/${str(f, "offering_id")}`);
}

// ---- Students --------------------------------------------------------------
export async function placeStudents(_p: LmsState, f: FormData): Promise<LmsState> {
  const { supabase } = await requireAdmin();
  const offeringId = str(f, "offering_id"); const section = str(f, "section_id");
  const users = f.getAll("user").map(String).filter(Boolean);
  if (!users.length) return { message: "Tick the students first." };
  if (str(f, "op") === "remove") {
    const { data, error } = await supabase.rpc("lms_unplace", { p_users: users, p_offering: offeringId });
    if (error) return fail(error);
    return done(offeringId, `Removed ${data} from the course. Their history is kept.`);
  }
  if (!section) return { message: "Choose the section to move them to." };
  const { data, error } = await supabase.rpc("lms_place", { p_users: users, p_section: section });
  if (error) return fail(error);
  const skipped = users.length - (data ?? 0);
  return done(offeringId, `Placed ${data} ${data === 1 ? "student" : "students"}.${skipped ? ` ${skipped} already there.` : ""}`);
}

// ---- Subjects and teachers -------------------------------------------------
export async function addSubject(_p: LmsState, f: FormData): Promise<LmsState> {
  const { supabase } = await requireAdmin();
  const offeringId = str(f, "offering_id");
  const names = str(f, "name").split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  if (!names.length) return { message: "Type a subject name." };
  const { count } = await supabase.from("lms_subjects").select("id", { count: "exact", head: true }).eq("offering_id", offeringId);
  const { error } = await supabase.from("lms_subjects").insert(names.map((name, i) => ({ offering_id: offeringId, name, sort: (count ?? 0) + i })));
  if (error) return fail(error);
  return done(offeringId, `Added ${names.join(", ")}.`);
}

export async function renameSubject(f: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(f, "name");
  if (name) await supabase.from("lms_subjects").update({ name }).eq("id", str(f, "subject_id"));
  revalidatePath(`/admin/lms/${str(f, "offering_id")}`);
}

export async function archiveSubject(f: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("lms_subjects").update({ archived: f.get("archived") === "1" }).eq("id", str(f, "subject_id"));
  revalidatePath(`/admin/lms/${str(f, "offering_id")}`);
}

export async function assignTeacher(_p: LmsState, f: FormData): Promise<LmsState> {
  const { supabase } = await requireAdmin();
  const offeringId = str(f, "offering_id"); const subject = str(f, "subject_id"); const teacher = str(f, "teacher_id");
  const sections = f.getAll("section").map(String).filter(Boolean);
  if (!subject || !teacher) return { message: "Choose the subject and the teacher." };
  if (!sections.length) return { message: "Tick at least one section." };
  const { error } = await supabase.from("lms_teaching").upsert(sections.map((s) => ({ section_id: s, subject_id: subject, teacher_id: teacher })), { onConflict: "section_id,subject_id,teacher_id", ignoreDuplicates: true });
  if (error) return fail(error);
  return done(offeringId, "Teacher assigned.");
}

export async function unassignTeacher(f: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("lms_teaching").delete().eq("section_id", str(f, "section_id")).eq("subject_id", str(f, "subject_id")).eq("teacher_id", str(f, "teacher_id"));
  revalidatePath(`/admin/lms/${str(f, "offering_id")}`);
}

// ---- Timetable -------------------------------------------------------------
export async function addPeriod(_p: LmsState, f: FormData): Promise<LmsState> {
  const { supabase } = await requireAdmin();
  const offeringId = str(f, "offering_id");
  const days = f.getAll("weekday").map(Number).filter((d) => d >= 0 && d <= 6);
  const sections = f.getAll("section").map(String).filter(Boolean);
  const starts = str(f, "starts"); const ends = str(f, "ends");
  if (!sections.length) return { message: "Tick at least one section." };
  if (!days.length) return { message: "Tick at least one day." };
  if (!starts || !ends || ends <= starts) return { message: "The end time must be after the start time." };
  const rows = sections.flatMap((section_id) => days.map((weekday) => ({
    section_id, weekday, starts, ends, subject_id: str(f, "subject_id") || null, teacher_id: str(f, "teacher_id") || null, room: str(f, "room") || null,
  })));
  const { error } = await supabase.from("lms_timetable").insert(rows);
  if (error) return fail(error);
  return done(offeringId, `Added ${rows.length} ${rows.length === 1 ? "class" : "classes"} to the timetable.`);
}

export async function deletePeriod(f: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("lms_timetable").delete().eq("id", str(f, "period_id"));
  revalidatePath(`/admin/lms/${str(f, "offering_id")}`);
}
