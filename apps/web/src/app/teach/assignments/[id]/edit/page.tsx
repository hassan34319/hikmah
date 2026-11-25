import Link from "next/link";
import { notFound } from "next/navigation";
import { LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { asFiles } from "@/lib/lms";
import { requireTeacher } from "@/lib/lms-server";
import { toPktInput } from "@/lib/time";
import { AssignmentEditor } from "../../../Editors";

export const dynamic = "force-dynamic";

export default async function EditAssignment({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, name, isAdmin, scopes } = await requireTeacher();
  const { id } = await params;
  const { data: a } = await supabase.from("lms_assignments").select("*, lms_assignment_sections(section_id)").eq("id", id).maybeSingle();
  if (!a) notFound();
  const scope = `${a.offering_id}|${a.subject_id}`;
  if (!scopes.some((s) => `${s.offeringId}|${s.subjectId}` === scope)) notFound();
  return (
    <LmsShell mode="teach" current="/teach/assignments" name={name} admin={isAdmin} other>
      <LmsHead title="Edit assignment" crumb={<><Link href="/teach/assignments">Assignments</Link> / <Link href={`/teach/assignments/${id}`}>{a.title}</Link></>} />
      <AssignmentEditor scopes={scopes} draft={{ id, scope, sections: ((a as unknown as { lms_assignment_sections: { section_id: string }[] }).lms_assignment_sections ?? []).map((x) => x.section_id), title: a.title, instructions: a.instructions ?? "", files: asFiles(a.files), due: toPktInput(a.due_at), max: Number(a.max_marks), allowLate: a.allow_late }} />
    </LmsShell>
  );
}
