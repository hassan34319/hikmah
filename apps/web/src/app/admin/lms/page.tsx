import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Classes" };

export default async function LmsHome() {
  const { supabase } = await requireAdmin();
  const [{ data: courses }, { data: sections }, { data: enrol }, { data: teaching }, { data: subjects }] = await Promise.all([
    supabase.from("offerings").select("id, title, status, offering_types!inner(kind), course_details(code, intake_year)").eq("offering_types.kind", "course").neq("status", "archived").order("title"),
    supabase.from("lms_sections").select("id, offering_id, archived"),
    supabase.from("lms_enrolments").select("offering_id").is("ended_at", null),
    supabase.from("lms_teaching").select("section_id, teacher_id"),
    supabase.from("lms_subjects").select("offering_id").eq("archived", false),
  ]);
  type C = { id: string; title: string; course_details: { code: string | null; intake_year: number | null } | null };
  const list = (courses ?? []) as unknown as C[];
  const secOffering = new Map((sections ?? []).map((s) => [s.id, s.offering_id]));
  const stat = (oid: string) => ({
    sections: (sections ?? []).filter((s) => s.offering_id === oid && !s.archived).length,
    students: (enrol ?? []).filter((e) => e.offering_id === oid).length,
    teachers: new Set((teaching ?? []).filter((t) => secOffering.get(t.section_id) === oid).map((t) => t.teacher_id)).size,
    subjects: (subjects ?? []).filter((s) => s.offering_id === oid).length,
  });
  const ready = list.filter((c) => stat(c.id).sections > 0);
  const rest = list.filter((c) => stat(c.id).sections === 0);

  return (
    <AdminShell isAdmin current="/admin/lms">
      <AdminHeader title="Classes" sub="The LMS. For each course: sections, subjects, teachers, students and the timetable. Teachers post materials, assignments and quizzes from their own Teaching page; students see them under My classes." />
      {ready.length > 0 && (
        <div className="lm-courses">
          {ready.map((c) => {
            const s = stat(c.id);
            return (
              <Link key={c.id} href={`/admin/lms/${c.id}`} className="ad-card lm-course">
                <span className="lm-course__code">{c.course_details?.code ?? "Course"}</span>
                <h2>{c.title}</h2>
                <dl>
                  <div><dt>Sections</dt><dd>{s.sections}</dd></div>
                  <div><dt>Students</dt><dd>{s.students}</dd></div>
                  <div><dt>Subjects</dt><dd>{s.subjects}</dd></div>
                  <div><dt>Teachers</dt><dd>{s.teachers}</dd></div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}
      <section className="ad-card" style={{ marginTop: ready.length ? 20 : 0 }}>
        <h2>{ready.length ? "Set up another course" : "Set up your first course"}</h2>
        <p className="ad-muted">Start with its sections (e.g. Weekdays, Weekend Morning), then subjects and teachers.</p>
        <div className="lm-setup">
          {rest.map((c) => <Link key={c.id} href={`/admin/lms/${c.id}`} className="ad-chip">{c.course_details?.code ? `${c.course_details.code} · ` : ""}{c.title}</Link>)}
          {!rest.length && <span className="ad-muted">Every course has sections.</span>}
        </div>
      </section>
    </AdminShell>
  );
}
