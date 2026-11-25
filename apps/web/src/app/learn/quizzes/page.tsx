import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { requireStudent } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LearnQuizzes() {
  const { supabase, userId, name, enrolments, isTeacher } = await requireStudent();
  const [{ data }, { data: att }] = enrolments.length ? await Promise.all([
    supabase.from("lms_quizzes").select("id, title, opens_at, closes_at, time_limit_min, lms_subjects(name)").eq("published", true).order("created_at", { ascending: false }),
    supabase.from("lms_quiz_attempts").select("quiz_id, submitted_at, score, max_score, needs_marking").eq("user_id", userId),
  ]) : [{ data: [] }, { data: [] }];
  type Q = { id: string; title: string; opens_at: string | null; closes_at: string | null; time_limit_min: number | null; lms_subjects: { name: string } | null };
  const by = new Map((att ?? []).map((a) => [a.quiz_id, a]));
  const state = (q: Q) => {
    const a = by.get(q.id);
    if (a?.submitted_at) return a.needs_marking ? { label: "Waiting for marks", pill: "draft" } : { label: `${Number(a.score)}/${Number(a.max_score)}`, pill: "confirmed" };
    if (a) return { label: "In progress", pill: "waitlisted" };
    if (q.opens_at && new Date(q.opens_at) > new Date()) return { label: `Opens ${fmtDate(q.opens_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`, pill: "draft" };
    if (q.closes_at && new Date(q.closes_at) < new Date()) return { label: "Closed", pill: "cancelled" };
    return { label: "Open", pill: "waitlisted" };
  };
  const list = (data ?? []) as unknown as Q[];
  const { data: sums } = list.length ? await supabase.rpc("lms_quiz_summary", { p_quizzes: list.map((q) => q.id) }) : { data: [] };
  const count = new Map((sums ?? []).map((x) => [x.quiz_id, x.questions]));
  return (
    <LmsShell mode="learn" current="/learn/quizzes" name={name} other={isTeacher}>
      <LmsHead title="Quizzes" />
      {list.length ? (
        <section className="ad-card"><ul className="lm-list">
          {list.map((q) => { const s = state(q); return (
            <li key={q.id}><Link href={`/learn/quizzes/${q.id}`}><strong>{q.title}</strong><span className="ad-muted">{q.lms_subjects?.name} · {count.get(q.id) ?? 0} questions{q.time_limit_min ? ` · ${q.time_limit_min} min` : ""}{q.closes_at ? ` · closes ${fmtDate(q.closes_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}</span></Link>
              <span className={`ad-pill ad-pill--${s.pill}`}>{s.label}</span></li>
          ); })}
        </ul></section>
      ) : <Empty title="No quizzes yet">When a teacher publishes a quiz for your section, it shows up here.</Empty>}
    </LmsShell>
  );
}
