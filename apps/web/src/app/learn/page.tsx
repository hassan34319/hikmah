import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { WEEKDAYS, dueLabel, fmtTime } from "@/lib/lms";
import { requireStudent } from "@/lib/lms-server";
import { fmtDate, timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LearnHome() {
  const { supabase, userId, name, enrolments, isTeacher } = await requireStudent();
  const sections = enrolments.map((e) => e.sectionId);
  const today = new Date(Date.now() + 5 * 3600_000).getUTCDay();
  if (!sections.length) {
    return (
      <LmsShell mode="learn" current="/learn" name={name} other={isTeacher}>
        <LmsHead title={`Assalamu alaikum${name ? `, ${name.split(" ")[0]}` : ""}`} />
        <Empty title="You're not in a class yet">
          Once you’re selected for a course and placed in a section, your timetable, materials, assignments and quizzes appear here.
          {" "}<Link href="/account">See your applications</Link>.
        </Empty>
      </LmsShell>
    );
  }
  const now = new Date().toISOString();
  const [{ data: posts }, { data: assignments }, { data: subs }, { data: quizzes }, { data: attempts }, { data: periods }] = await Promise.all([
    supabase.from("lms_posts").select("id, kind, title, topic, created_at, lms_subjects(name)").order("created_at", { ascending: false }).limit(12),
    supabase.from("lms_assignments").select("id, title, due_at, allow_late, lms_subjects(name)").gte("due_at", new Date(Date.now() - 7 * 86_400_000).toISOString()).order("due_at").limit(20),
    supabase.from("lms_submissions").select("assignment_id").eq("user_id", userId),
    supabase.from("lms_quizzes").select("id, title, closes_at, opens_at, time_limit_min, lms_subjects(name)").eq("published", true).or(`closes_at.is.null,closes_at.gt.${now}`).limit(20),
    supabase.from("lms_quiz_attempts").select("quiz_id, submitted_at").eq("user_id", userId),
    supabase.from("lms_timetable").select("starts, ends, room, lms_subjects(name), profiles(full_name)").in("section_id", sections).eq("weekday", today).order("starts"),
  ]);
  type P = { id: string; kind: string; title: string; topic: string | null; created_at: string; lms_subjects: { name: string } | null };
  const all = (posts ?? []) as unknown as P[];
  const notices = all.filter((p) => p.kind === "announcement").slice(0, 3);
  const materials = all.filter((p) => p.kind === "material").slice(0, 5);
  const done = new Set((subs ?? []).map((s) => s.assignment_id));
  type A = { id: string; title: string; due_at: string; allow_late: boolean; lms_subjects: { name: string } | null };
  const todo = ((assignments ?? []) as unknown as A[]).filter((a) => !done.has(a.id) && (a.allow_late || new Date(a.due_at) > new Date()));
  const taken = new Set((attempts ?? []).filter((a) => a.submitted_at).map((a) => a.quiz_id));
  type Q = { id: string; title: string; closes_at: string | null; opens_at: string | null; time_limit_min: number | null; lms_subjects: { name: string } | null };
  const openQuizzes = ((quizzes ?? []) as unknown as Q[]).filter((q) => !taken.has(q.id) && (!q.opens_at || new Date(q.opens_at) <= new Date()));
  type T = { starts: string; ends: string; room: string | null; lms_subjects: { name: string } | null; profiles: { full_name: string | null } | null };

  return (
    <LmsShell mode="learn" current="/learn" name={name} other={isTeacher}>
      <LmsHead title={`Assalamu alaikum, ${name.split(" ")[0]}`} sub={enrolments.map((e) => `${e.course} · ${e.section}${e.venue ? `, ${e.venue}` : ""}`).join("  |  ")} />
      {notices.length > 0 && (
        <div className="lm-notices">
          {notices.map((n) => <Link key={n.id} href={`/learn/materials/${n.id}`} className="lm-notice"><span className="lm-notice__tag">Announcement · {n.lms_subjects?.name}</span><strong>{n.title}</strong><span className="ad-muted">{timeAgo(n.created_at)} ago</span></Link>)}
        </div>
      )}
      <div className="lm-grid">
        <section className="ad-card">
          <h2>To do</h2>
          {todo.length || openQuizzes.length ? (
            <ul className="lm-list">
              {todo.map((a) => <li key={a.id}><Link href={`/learn/assignments/${a.id}`}><strong>{a.title}</strong><span className="ad-muted">{a.lms_subjects?.name} · assignment</span></Link><span className={`lm-due${new Date(a.due_at) < new Date() ? " is-over" : ""}`}>{dueLabel(a.due_at)}</span></li>)}
              {openQuizzes.map((q) => <li key={q.id}><Link href={`/learn/quizzes/${q.id}`}><strong>{q.title}</strong><span className="ad-muted">{q.lms_subjects?.name} · quiz{q.time_limit_min ? `, ${q.time_limit_min} min` : ""}</span></Link>{q.closes_at && <span className="lm-due">closes {fmtDate(q.closes_at, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>}</li>)}
            </ul>
          ) : <p className="ad-muted">You’re all caught up.</p>}
        </section>
        <section className="ad-card">
          <h2>Today, {WEEKDAYS[today]}</h2>
          {(periods ?? []).length ? (
            <ul className="lm-today">
              {((periods ?? []) as unknown as T[]).map((p, i) => <li key={i}><span className="lm-period__time">{fmtTime(p.starts)} to {fmtTime(p.ends)}</span><strong>{p.lms_subjects?.name ?? "Break"}</strong><span className="ad-muted">{[p.profiles?.full_name, p.room].filter(Boolean).join(" · ")}</span></li>)}
            </ul>
          ) : <p className="ad-muted">No classes today. <Link href="/learn/timetable">See the week</Link>.</p>}
        </section>
        <section className="ad-card lm-grid__wide">
          <h2>New materials</h2>
          {materials.length ? (
            <ul className="lm-list">
              {materials.map((m) => <li key={m.id}><Link href={`/learn/materials/${m.id}`}><strong>{m.title}</strong><span className="ad-muted">{m.lms_subjects?.name}{m.topic ? ` · ${m.topic}` : ""} · {timeAgo(m.created_at)} ago</span></Link></li>)}
            </ul>
          ) : <p className="ad-muted">Your teachers haven’t posted anything yet.</p>}
          <Link href="/learn/materials" className="lm-more">All materials →</Link>
        </section>
      </div>
    </LmsShell>
  );
}
