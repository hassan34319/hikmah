import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { Timetable, type Period } from "@/components/lms/Timetable";
import { requireTeacher } from "@/lib/lms-server";

export const dynamic = "force-dynamic";

export default async function TeachTimetable() {
  const { supabase, userId, name, isAdmin, scopes } = await requireTeacher();
  const sectionIds = [...new Set(scopes.flatMap((s) => s.sections.map((x) => x.id)))];
  const { data } = sectionIds.length ? await supabase.from("lms_timetable").select("id, weekday, starts, ends, room, teacher_id, lms_subjects(name), lms_sections(name), profiles(full_name)").in("section_id", sectionIds).order("starts") : { data: [] };
  type R = { id: string; weekday: number; starts: string; ends: string; room: string | null; teacher_id: string | null; lms_subjects: { name: string } | null; lms_sections: { name: string } | null; profiles: { full_name: string | null } | null };
  const rows = ((data ?? []) as unknown as R[]).filter((r) => isAdmin || r.teacher_id === userId || !r.teacher_id);
  const periods: Period[] = rows.map((r) => ({ id: r.id, weekday: r.weekday, starts: r.starts, ends: r.ends, title: r.lms_subjects?.name ?? "Break", detail: [r.lms_sections?.name, r.room, isAdmin ? r.profiles?.full_name : null].filter(Boolean).join(" · ") }));
  return (
    <LmsShell mode="teach" current="/teach/timetable" name={name} admin={isAdmin} other>
      <LmsHead title="Timetable" sub="Your classes each week. The admin team keeps this up to date." />
      {periods.length ? <Timetable periods={periods} /> : <Empty title="Nothing on your timetable yet">An admin adds classes to the timetable under Classes.</Empty>}
    </LmsShell>
  );
}
