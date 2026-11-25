import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { Timetable, type Period } from "@/components/lms/Timetable";
import { requireStudent } from "@/lib/lms-server";

export const dynamic = "force-dynamic";

export default async function LearnTimetable() {
  const { supabase, name, enrolments, isTeacher } = await requireStudent();
  const sections = enrolments.map((e) => e.sectionId);
  const { data } = sections.length ? await supabase.from("lms_timetable").select("id, weekday, starts, ends, room, lms_subjects(name), profiles(full_name)").in("section_id", sections).order("starts") : { data: [] };
  type R = { id: string; weekday: number; starts: string; ends: string; room: string | null; lms_subjects: { name: string } | null; profiles: { full_name: string | null } | null };
  const periods: Period[] = ((data ?? []) as unknown as R[]).map((r) => ({ id: r.id, weekday: r.weekday, starts: r.starts, ends: r.ends, title: r.lms_subjects?.name ?? "Break", detail: [r.profiles?.full_name, r.room].filter(Boolean).join(" · ") }));
  return (
    <LmsShell mode="learn" current="/learn/timetable" name={name} other={isTeacher}>
      <LmsHead title="Timetable" sub={enrolments.map((e) => `${e.course} · ${e.section}${e.venue ? `, ${e.venue}` : ""}`).join("  |  ")} />
      {periods.length ? <Timetable periods={periods} /> : <Empty title="No timetable yet">Your class times appear here once they’re set.</Empty>}
    </LmsShell>
  );
}
