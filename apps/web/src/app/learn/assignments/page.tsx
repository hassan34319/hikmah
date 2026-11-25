import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { dueLabel } from "@/lib/lms";
import { requireStudent } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LearnAssignments() {
  const { supabase, userId, name, enrolments, isTeacher } = await requireStudent();
  const [{ data }, { data: subs }] = enrolments.length ? await Promise.all([
    supabase.from("lms_assignments").select("id, title, due_at, max_marks, allow_late, lms_subjects(name)").order("due_at", { ascending: false }),
    supabase.from("lms_submissions").select("assignment_id, submitted_at, marks, marked_at").eq("user_id", userId),
  ]) : [{ data: [] }, { data: [] }];
  type A = { id: string; title: string; due_at: string; max_marks: number; allow_late: boolean; lms_subjects: { name: string } | null };
  const list = (data ?? []) as unknown as A[];
  const by = new Map((subs ?? []).map((s) => [s.assignment_id, s]));
  const status = (a: A) => {
    const s = by.get(a.id);
    if (s?.marked_at) return { label: `Marked ${Number(s.marks)}/${Number(a.max_marks)}`, pill: "confirmed" };
    if (s) return { label: new Date(s.submitted_at) > new Date(a.due_at) ? "Handed in late" : "Handed in", pill: "draft" };
    if (new Date(a.due_at) < new Date()) return { label: a.allow_late ? "Overdue" : "Missed", pill: "cancelled" };
    return { label: "To do", pill: "waitlisted" };
  };
  const upcoming = list.filter((a) => !by.has(a.id) && (new Date(a.due_at) > new Date() || a.allow_late)).sort((x, y) => x.due_at.localeCompare(y.due_at));
  const rest = list.filter((a) => !upcoming.includes(a));
  const Row = ({ a }: { a: A }) => { const s = status(a); return (
    <li><Link href={`/learn/assignments/${a.id}`}><strong>{a.title}</strong><span className="ad-muted">{a.lms_subjects?.name} · due {fmtDate(a.due_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></Link>
      <span className={`ad-pill ad-pill--${s.pill}`}>{s.label}</span></li>
  ); };
  return (
    <LmsShell mode="learn" current="/learn/assignments" name={name} other={isTeacher}>
      <LmsHead title="Assignments" />
      {list.length ? <>
        {upcoming.length > 0 && <section className="ad-card"><h2>To do</h2><ul className="lm-list">{upcoming.map((a) => <li key={a.id}><Link href={`/learn/assignments/${a.id}`}><strong>{a.title}</strong><span className="ad-muted">{a.lms_subjects?.name}</span></Link><span className={`lm-due${new Date(a.due_at) < new Date() ? " is-over" : ""}`}>{dueLabel(a.due_at)}</span></li>)}</ul></section>}
        {rest.length > 0 && <section className="ad-card"><h2>Done and past</h2><ul className="lm-list">{rest.map((a) => <Row key={a.id} a={a} />)}</ul></section>}
      </> : <Empty title="No assignments yet">When a teacher sets work for your section, it shows up here with its due date.</Empty>}
    </LmsShell>
  );
}
