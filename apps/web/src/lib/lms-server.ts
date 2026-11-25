import "server-only";
import { redirect } from "next/navigation";
import { renderClassNoticeEmail, type ClassNoticeKind } from "@hikmah/emails";
import { emailLogoUrl, sendEmailBatch } from "./email";
import { SITE_URL } from "./env";
import { createClient } from "./supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Scope = {
  offeringId: string; course: string; code: string | null;
  subjectId: string; subject: string;
  sections: { id: string; name: string }[];
};

export type TeacherContext = { supabase: Client; userId: string; name: string; isAdmin: boolean; scopes: Scope[] };

/** Signed-in teacher (or admin). Scopes list every course subject they can post for, with the sections they teach it in. */
export async function requireTeacher(): Promise<TeacherContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/teach");
  const [{ data: roles }, { data: me }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
  ]);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
  const isFaculty = (roles ?? []).some((r) => r.role === "faculty");

  let rows: { section_id: string; subject_id: string }[] = [];
  if (isAdmin) {
    const [{ data: secs }, { data: subs }] = await Promise.all([
      supabase.from("lms_sections").select("id, offering_id").eq("archived", false),
      supabase.from("lms_subjects").select("id, offering_id").eq("archived", false),
    ]);
    rows = (subs ?? []).flatMap((s) => (secs ?? []).filter((x) => x.offering_id === s.offering_id).map((x) => ({ section_id: x.id, subject_id: s.id })));
  } else {
    const { data } = await supabase.from("lms_teaching").select("section_id, subject_id").eq("teacher_id", user.id);
    rows = data ?? [];
  }
  if (!isAdmin && !isFaculty && !rows.length) redirect("/learn");

  const secIds = [...new Set(rows.map((r) => r.section_id))];
  const subIds = [...new Set(rows.map((r) => r.subject_id))];
  const [{ data: secs }, { data: subs }] = await Promise.all([
    secIds.length ? supabase.from("lms_sections").select("id, name, sort, archived, offering_id, offerings(title, course_details(code))").in("id", secIds) : Promise.resolve({ data: [] }),
    subIds.length ? supabase.from("lms_subjects").select("id, name, sort, archived, offering_id").in("id", subIds) : Promise.resolve({ data: [] }),
  ]);
  type S = { id: string; name: string; sort: number; archived: boolean; offering_id: string; offerings: { title: string; course_details: { code: string | null } | null } | null };
  const secMap = new Map(((secs ?? []) as unknown as S[]).filter((s) => !s.archived).map((s) => [s.id, s]));
  const scopes: Scope[] = [];
  for (const sub of (subs ?? []).filter((s) => !s.archived).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))) {
    const sections = rows.filter((r) => r.subject_id === sub.id).map((r) => secMap.get(r.section_id)).filter((s): s is S => !!s)
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
    if (!sections.length) continue;
    const o = sections[0]!.offerings;
    scopes.push({ offeringId: sub.offering_id, course: o?.title ?? "", code: o?.course_details?.code ?? null, subjectId: sub.id, subject: sub.name, sections: sections.map((s) => ({ id: s.id, name: s.name })) });
  }
  scopes.sort((a, b) => a.course.localeCompare(b.course));
  return { supabase, userId: user.id, name: me?.full_name || me?.email || "Teacher", isAdmin, scopes };
}

export type Enrolment = { sectionId: string; section: string; offeringId: string; course: string; code: string | null; venue: string | null };
export type StudentContext = { supabase: Client; userId: string; name: string; email: string; enrolments: Enrolment[]; isTeacher: boolean };

/** Signed-in student with their current sections. Not enrolled: an empty list (pages show a friendly note). */
export async function requireStudent(): Promise<StudentContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/learn");
  const [{ data: rows }, { data: me }, { data: roles }] = await Promise.all([
    supabase.from("lms_enrolments").select("section_id, offering_id, lms_sections(name, venues(name)), offerings(title, course_details(code))").eq("user_id", user.id).is("ended_at", null),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  type R = { section_id: string; offering_id: string; lms_sections: { name: string; venues: { name: string } | null } | null; offerings: { title: string; course_details: { code: string | null } | null } | null };
  const enrolments = ((rows ?? []) as unknown as R[]).map((r) => ({
    sectionId: r.section_id, section: r.lms_sections?.name ?? "", offeringId: r.offering_id, course: r.offerings?.title ?? "",
    code: r.offerings?.course_details?.code ?? null, venue: r.lms_sections?.venues?.name ?? null,
  }));
  const isTeacher = (roles ?? []).some((r) => ["faculty", "admin", "super_admin"].includes(r.role));
  return { supabase, userId: user.id, name: me?.full_name || me?.email || "", email: me?.email ?? "", enrolments, isTeacher };
}

/** Emails every current student in the given sections. Returns how many were sent. */
export async function notifyStudents(supabase: Client, opts: {
  sections: string[]; kind: ClassNoticeKind; course: string; subject?: string | null; title: string; body?: string | null; when?: string | null; teacher?: string | null; path: string;
}) {
  if (!opts.sections.length) return 0;
  const { data } = await supabase.from("lms_enrolments").select("user_id, profiles(full_name, email)").in("section_id", opts.sections).is("ended_at", null);
  type R = { user_id: string; profiles: { full_name: string | null; email: string } | null };
  const seen = new Set<string>();
  const people = ((data ?? []) as unknown as R[]).filter((r) => r.profiles?.email && !seen.has(r.user_id) && seen.add(r.user_id));
  const msgs = await Promise.all(people.map(async (r) => {
    const first = (r.profiles!.full_name ?? "").split(" ")[0] || "there";
    const m = await renderClassNoticeEmail({ ...opts, firstName: first, url: `${SITE_URL}${opts.path}`, logoUrl: emailLogoUrl });
    return { to: r.profiles!.email, ...m };
  }));
  return msgs.length ? sendEmailBatch(msgs) : 0;
}

/** Signed links for files the caller may read (RLS on storage decides). */
export async function signFiles(supabase: Client, paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const { data } = await supabase.storage.from("lms").createSignedUrls(paths, 60 * 30);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl]));
}
