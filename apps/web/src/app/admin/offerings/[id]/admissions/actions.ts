"use server";

import { revalidatePath } from "next/cache";
import { renderAdmissionEmail, type AdmissionEmailKind } from "@hikmah/emails";
import type { AdmissionRow, AdmissionStage } from "@hikmah/db";
import { requireAdmin, requireInterviewer } from "@/lib/admin";
import { emailLogoUrl, lastEmailError, sendEmailBatch } from "@/lib/email";
import { SITE_URL } from "@/lib/env";
import { fmtDate, fromPktInput } from "@/lib/time";

export type AdmState = { ok?: boolean; message?: string };
type Row = { id: string; stage: AdmissionStage; test_token: string; student_id: string | null; batch: string | null; campus: string | null; test_score: number | null; profiles: { full_name: string | null; email: string } | null };

const ids = (form: FormData) => form.getAll("ids").map(String).filter(Boolean);
const first = (name?: string | null) => name?.split(" ")[0] || "there";

async function loadRows(offeringId: string, only: string[] | null, stages: AdmissionStage[]) {
  const { supabase } = await requireAdmin();
  let q = supabase.from("admissions").select("id, stage, test_token, student_id, batch, campus, test_score, profiles(full_name, email)").eq("offering_id", offeringId).in("stage", stages);
  if (only) q = q.in("id", only);
  const [{ data }, { data: off }] = await Promise.all([q, supabase.from("offerings").select("title").eq("id", offeringId).single()]);
  return { supabase, rows: (data ?? []) as unknown as Row[], course: off?.title ?? "your course" };
}

async function email(kind: AdmissionEmailKind, course: string, rows: Row[], extra: (r: Row) => Record<string, string | null | undefined> = () => ({})) {
  const msgs = await Promise.all(rows.filter((r) => r.profiles?.email).map(async (r) => ({
    to: r.profiles!.email,
    ...(await renderAdmissionEmail({ kind, course, firstName: first(r.profiles?.full_name), logoUrl: emailLogoUrl, ...extra(r) })),
  })));
  return { sent: await sendEmailBatch(msgs), total: msgs.length };
}

const result = (sent: number, total: number, what: string): AdmState =>
  sent === 0 && total > 0 ? { message: `Updated, but no emails were sent: ${lastEmailError ?? "unknown error"}` } : { ok: true, message: `${what} ${sent} ${sent === 1 ? "applicant" : "applicants"}.` };

/** Shortlist: send the admission test. */
export async function sendTest(_p: AdmState, form: FormData): Promise<AdmState> {
  const offeringId = String(form.get("offering_id"));
  const { supabase, rows, course } = await loadRows(offeringId, ids(form), ["applied", "test_invited"]);
  if (!rows.length) return { message: "Tick applicants who have applied (or were already sent the test)." };
  await supabase.from("admissions").update({ stage: "test_invited", test_invited_at: new Date().toISOString() }).in("id", rows.map((r) => r.id)).eq("stage", "applied");
  const { sent, total } = await email("test", course, rows, (r) => ({ url: `${SITE_URL}/admissions/${r.test_token}` }));
  revalidatePath(`/admin/offerings/${offeringId}/admissions`);
  return result(sent, total, "Admission test sent to");
}

/** Invite to interview: ticked applicants, or everyone at or above a cut-off score. */
export async function inviteInterview(_p: AdmState, form: FormData): Promise<AdmState> {
  const offeringId = String(form.get("offering_id"));
  const cutoff = form.get("cutoff") ? Number(form.get("cutoff")) : null;
  const picked = ids(form);
  const loaded = await loadRows(offeringId, picked.length ? picked : null, ["test_done", "interview_invited"]);
  const { supabase, course } = loaded;
  let rows = loaded.rows;
  if (cutoff != null && !Number.isNaN(cutoff)) rows = rows.filter((r) => r.stage === "test_done" && Number(r.test_score ?? 0) >= cutoff);
  else if (!picked.length) return { message: "Tick applicants, or set a cut-off score." };
  if (!rows.length) return { message: cutoff != null ? `Nobody who finished the test scored ${cutoff} or more.` : "Tick applicants who have finished the test." };
  const { count } = await supabase.from("interview_slots").select("id", { count: "exact", head: true }).eq("offering_id", offeringId).gt("starts_at", new Date().toISOString());
  if (!count) return { message: "Add interview slots first (below), so applicants can book a time." };
  await supabase.from("admissions").update({ stage: "interview_invited", interview_invited_at: new Date().toISOString() }).in("id", rows.map((r) => r.id)).eq("stage", "test_done");
  const { sent, total } = await email("interview", course, rows, (r) => ({ url: `${SITE_URL}/admissions/${r.test_token}` }));
  revalidatePath(`/admin/offerings/${offeringId}/admissions`);
  return result(sent, total, "Interview invitation sent to");
}

/** Mark ticked applicants as selected, waitlisted or not selected (no emails yet). */
export async function decide(_p: AdmState, form: FormData): Promise<AdmState> {
  const { supabase } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  const decision = String(form.get("decision")) as AdmissionStage;
  if (!["selected", "waitlisted", "not_selected"].includes(decision)) return { message: "Choose a decision." };
  const picked = ids(form);
  if (!picked.length) return { message: "Tick the applicants first." };
  const patch: Partial<AdmissionRow> = { stage: decision, decided_at: new Date().toISOString() };
  const batch = String(form.get("batch") ?? "").trim(); const campus = String(form.get("campus") ?? "").trim();
  const sectionId = String(form.get("section_id") ?? "").trim();
  if (decision === "selected") {
    if (batch) patch.batch = batch; if (campus) patch.campus = campus;
    if (sectionId) {
      const { data: sec } = await supabase.from("lms_sections").select("id, name, venues(name)").eq("id", sectionId).eq("offering_id", offeringId).maybeSingle();
      if (!sec) return { message: "That section no longer exists." };
      patch.section_id = sec.id; patch.batch = sec.name;
      const venue = (sec.venues as unknown as { name: string } | null)?.name; if (venue) patch.campus = venue;
    }
  }
  const { error } = await supabase.from("admissions").update(patch).eq("offering_id", offeringId).in("id", picked).is("decision_sent_at", null);
  if (error) return { message: error.message };
  revalidatePath(`/admin/offerings/${offeringId}/admissions`);
  return { ok: true, message: `Marked ${picked.length} as ${decision.replace("_", " ")}. Nothing is emailed until you press "Email decisions" under Send decisions.` };
}

/** Emails every decided applicant who has not been told yet. Selected applicants get their student ID. */
export async function sendDecisions(_p: AdmState, form: FormData): Promise<AdmState> {
  const offeringId = String(form.get("offering_id"));
  const { supabase, rows, course } = await loadRows(offeringId, null, ["selected", "waitlisted", "not_selected"]);
  const { data: pending } = await supabase.from("admissions").select("id").eq("offering_id", offeringId).is("decision_sent_at", null).in("stage", ["selected", "waitlisted", "not_selected"]);
  const todo = rows.filter((r) => (pending ?? []).some((p) => p.id === r.id));
  if (!todo.length) return { message: "Everyone with a decision has already been emailed." };
  for (const r of todo.filter((x) => x.stage === "selected" && !x.student_id)) {
    const { data } = await supabase.rpc("admission_assign_student_id", { p_admission: r.id });
    r.student_id = data ?? null;
  }
  let sent = 0, total = 0;
  for (const kind of ["selected", "waitlisted", "not_selected"] as const) {
    const group = todo.filter((r) => r.stage === kind);
    if (!group.length) continue;
    const res = await email(kind, course, group, (r) => ({ studentId: r.student_id, batch: r.batch, campus: r.campus, url: `${SITE_URL}${kind === "selected" ? "/learn" : "/events"}` }));
    sent += res.sent; total += res.total;
  }
  await supabase.from("admissions").update({ decision_sent_at: new Date().toISOString() }).in("id", todo.map((r) => r.id));
  // Selected students with a section go straight into the LMS.
  const { data: toPlace } = await supabase.from("admissions").select("user_id, section_id").in("id", todo.filter((r) => r.stage === "selected").map((r) => r.id)).not("section_id", "is", null);
  const bySection = new Map<string, string[]>();
  for (const p of toPlace ?? []) if (p.section_id) bySection.set(p.section_id, [...(bySection.get(p.section_id) ?? []), p.user_id]);
  for (const [section, users] of bySection) await supabase.rpc("lms_place", { p_users: users, p_section: section });
  await supabase.from("registrations").update({ status: "confirmed" }).in("id", (await supabase.from("admissions").select("registration_id").in("id", todo.filter((r) => r.stage === "selected").map((r) => r.id))).data?.map((x) => x.registration_id) ?? []);
  revalidatePath(`/admin/offerings/${offeringId}/admissions`);
  return result(sent, total, "Decision emails sent to");
}

export async function saveSettings(_p: AdmState, form: FormData): Promise<AdmState> {
  const { supabase } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  const year = Number(form.get("intake_year"));
  const prompt = String(form.get("essay_prompt") ?? "").trim().slice(0, 400);
  const { error } = await supabase.from("course_details").upsert({ offering_id: offeringId, intake_year: year >= 2020 && year <= 2100 ? year : null, ...(prompt ? { essay_prompt: prompt } : {}) });
  if (error) return { message: error.message };
  revalidatePath(`/admin/offerings/${offeringId}/admissions`);
  return { ok: true, message: "Saved." };
}

/** Adds interview slots: from start to end time on a day, every N minutes. */
export async function addSlots(_p: AdmState, form: FormData): Promise<AdmState> {
  const { supabase } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  const day = String(form.get("day") ?? "");
  const from = fromPktInput(`${day}T${form.get("from")}`), to = fromPktInput(`${day}T${form.get("to")}`);
  const every = Math.max(5, Math.min(240, Number(form.get("every")) || 20));
  const capacity = Math.max(1, Math.min(50, Number(form.get("capacity")) || 1));
  const venue = String(form.get("venue_id") ?? "") || null;
  if (!from || !to || new Date(to) <= new Date(from)) return { message: "Choose a day and a start time before the end time." };
  const rows = [];
  for (let t = new Date(from).getTime(); t + every * 60_000 <= new Date(to).getTime() && rows.length < 60; t += every * 60_000) {
    rows.push({ offering_id: offeringId, starts_at: new Date(t).toISOString(), minutes: every, capacity, venue_id: venue });
  }
  if (!rows.length) return { message: "That range is shorter than one slot." };
  const { error } = await supabase.from("interview_slots").insert(rows);
  if (error) return { message: error.message };
  revalidatePath(`/admin/offerings/${offeringId}/admissions`);
  return { ok: true, message: `Added ${rows.length} slots on ${fmtDate(from, { weekday: "short", day: "numeric", month: "short" })}.` };
}

export async function deleteSlot(form: FormData) {
  const { supabase } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  await supabase.from("interview_slots").delete().eq("id", String(form.get("slot_id")));
  revalidatePath(`/admin/offerings/${offeringId}/admissions`);
}

export async function saveAdmissionNote(form: FormData) {
  const { supabase } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  await supabase.from("admissions").update({ admin_notes: String(form.get("admin_notes") ?? "").trim() || null }).eq("id", String(form.get("id")));
  revalidatePath(`/admin/offerings/${offeringId}/admissions`);
}

/** Interviewers (and admins) record a score out of 10. */
export async function recordInterview(_p: AdmState, form: FormData): Promise<AdmState> {
  const { supabase } = await requireInterviewer();
  const score = Number(form.get("score"));
  const { error } = await supabase.rpc("interview_record", { p_admission: String(form.get("id")), p_score: score, p_notes: String(form.get("notes") ?? "") });
  if (error) return { message: error.message === "bad_score" ? "Give a score from 0 to 10." : error.message };
  revalidatePath("/admin/interviews");
  return { ok: true, message: `Saved: ${score}/10.` };
}
