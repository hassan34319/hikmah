import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { dueLabel } from "@/lib/lms";
import { requireTeacher } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TeachAssignments() {
  const { supabase, name, isAdmin, scopes } = await requireTeacher();
  const offerings = [...new Set(scopes.map((s) => s.offeringId))];
  const { data } = offerings.length ? await supabase.from("lms_assignments").select("id, title, due_at, max_marks, offering_id, subject_id, lms_subjects(name), lms_assignment_sections(section_id, lms_sections(name)), lms_submissions(id, marked_at)").in("offering_id", offerings).order("due_at", { ascending: false }) : { data: [] };
  const secIds = [...new Set(scopes.flatMap((s) => s.sections.map((x) => x.id)))];
  const { data: enrol } = secIds.length ? await supabase.from("lms_enrolments").select("section_id").in("section_id", secIds).is("ended_at", null) : { data: [] };
  const size = (ids: string[]) => (enrol ?? []).filter((e) => ids.includes(e.section_id)).length;
  type A = { id: string; title: string; due_at: string; max_marks: number; offering_id: string; subject_id: string | null; lms_subjects: { name: string } | null; lms_assignment_sections: { section_id: string; lms_sections: { name: string } | null }[]; lms_submissions: { id: string; marked_at: string | null }[] };
  const list = ((data ?? []) as unknown as A[]).filter((a) => isAdmin || scopes.some((s) => s.offeringId === a.offering_id && s.subjectId === a.subject_id));
  return (
    <LmsShell mode="teach" current="/teach/assignments" name={name} admin={isAdmin} other>
      <LmsHead title="Assignments" sub="Set work, see who has handed it in, and mark it in one place." actions={<Link href="/teach/assignments/new" className="hk-btn hk-btn--primary hk-btn--sm">Set assignment</Link>} />
      {list.length ? (
        <section className="ad-card" style={{ padding: 0 }}>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Assignment</th><th>Sections</th><th>Due</th><th>Handed in</th><th>To mark</th></tr></thead>
              <tbody>
                {list.map((a) => {
                  const total = size(a.lms_assignment_sections.map((x) => x.section_id));
                  const open = a.lms_submissions.filter((s) => !s.marked_at).length;
                  return (
                    <tr key={a.id}>
                      <td><Link href={`/teach/assignments/${a.id}`}><strong>{a.title}</strong></Link><div className="ad-muted">{a.lms_subjects?.name} · out of {a.max_marks}</div></td>
                      <td>{a.lms_assignment_sections.map((x) => x.lms_sections?.name).filter(Boolean).join(", ")}</td>
                      <td>{fmtDate(a.due_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}<div className="ad-muted">{dueLabel(a.due_at)}</div></td>
                      <td>{a.lms_submissions.length} / {total}</td>
                      <td>{open ? <span className="lm-badge">{open}</span> : <span className="ad-muted">none</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : <Empty title="No assignments yet">Use “Set assignment” to give your sections some work with a due date.</Empty>}
    </LmsShell>
  );
}
