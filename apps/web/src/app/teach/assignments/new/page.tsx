import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { requireTeacher } from "@/lib/lms-server";
import { toPktInput } from "@/lib/time";
import { AssignmentEditor } from "../../Editors";

export const dynamic = "force-dynamic";

export default async function NewAssignment() {
  const { name, isAdmin, scopes } = await requireTeacher();
  const week = new Date(Date.now() + 7 * 86_400_000); week.setUTCHours(18, 59, 0, 0); // 11:59 pm Karachi, a week from now
  return (
    <LmsShell mode="teach" current="/teach/assignments" name={name} admin={isAdmin} other>
      <LmsHead title="Set assignment" crumb={<Link href="/teach/assignments">Assignments</Link>} sub="Students hand in a file or typed answer before the due time. You mark and comment here." />
      {scopes.length ? <AssignmentEditor scopes={scopes} draft={{ sections: [], title: "", instructions: "", files: [], due: toPktInput(week.toISOString()), max: 10, allowLate: true }} /> : <Empty title="No classes yet">An admin needs to assign you to a subject first.</Empty>}
    </LmsShell>
  );
}
