import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { WEEKDAYS, fmtTime } from "@/lib/lms";
import { requireTeacher } from "@/lib/lms-server";
import { fmtDate, timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TeachHome() {
  const { supabase, userId, name, isAdmin, scopes } = await requireTeacher();
  const offerings = [...new Set(scopes.map((s) => s.offeringId))];
  const sectionIds = [...new Set(scopes.flatMap((s) => s.sections.map((x) => x.id)))];
  const today = new Date(Date.now() + 5 * 3600_000).getUTCDay();
  const [{ data: posts }, { data: assignments }, { data: quizzes }, { data: periods }, { data: enrolled }] = await Promise.all([
    offerings.length ? supabase.from("lms_posts").select("id, kind, title, created_at, lms_subjects(name)").in("offering_id", offerings).order("created_at", { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
    offerings.length ? supabase.from("lms_assignments").select("id, title, due_at, lms_subjects(name), lms_submissions(id, marked_at)").in("offering_id", offerings).order("due_at", { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
    offerings.length ? supabase.from("lms_quizzes").select("id, title, published, lms_quiz_attempts(id, needs_marking, submitted_at)").in("offering_id", offerings).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
    sectionIds.length ? supabase.from("lms_timetable").select("starts, ends, room, weekday, teacher_id, section_id, lms_subjects(name), lms_sections(name)").in("section_id", sectionIds).eq("weekday", today).order("starts") : Promise.resolve({ data: [] }),
    sectionIds.length ? supabase.from("lms_enrolments").select("user_id", { count: "exact", head: false }).in("section_id", sectionIds).is("ended_at", null) : Promise.resolve({ data: [] }),
  ]);
  type A = { id: string; title: string; due_at: string; lms_subjects: { name: string } | null; lms_submissions: { id: string; marked_at: string | null }[] };
  type Q = { id: string; title: string; published: boolean; lms_quiz_attempts: { id: string; needs_marking: boolean; submitted_at: string | null }[] };
  const toMark = ((assignments ?? []) as unknown as A[]).map((a) => ({ ...a, open: a.lms_submissions.filter((s) => !s.marked_at).length })).filter((a) => a.open > 0);
  const quizMark = ((quizzes ?? []) as unknown as Q[]).map((q) => ({ ...q, open: q.lms_quiz_attempts.filter((a) => a.submitted_at && a.needs_marking).length })).filter((q) => q.open > 0);
  type T = { starts: string; ends: string; room: string | null; teacher_id: string | null; lms_subjects: { name: string } | null; lms_sections: { name: string } | null };
  const mine = ((periods ?? []) as unknown as T[]).filter((p) => isAdmin ? true : p.teacher_id === userId || !p.teacher_id);
  const students = new Set((enrolled ?? []).map((e) => e.user_id)).size;

  return (
    <LmsShell mode="teach" current="/teach" name={name} admin={isAdmin} other>
      <LmsHead title={`Assalamu alaikum, ${name.split(" ")[0]}`} sub={scopes.length ? `${scopes.length} ${scopes.length === 1 ? "subject" : "subjects"} · ${students} ${students === 1 ? "student" : "students"}` : undefined}
        actions={scopes.length ? <>
          <Link href="/teach/materials/new" className="hk-btn hk-btn--primary hk-btn--sm">Post material</Link>
          <Link href="/teach/assignments/new" className="hk-btn hk-btn--ghost hk-btn--sm">Set assignment</Link>
          <Link href="/teach/quizzes/new" className="hk-btn hk-btn--ghost hk-btn--sm">New quiz</Link>
          <Link href="/teach/materials/new?kind=announcement" className="hk-btn hk-btn--ghost hk-btn--sm">Announce</Link>
        </> : undefined} />
      {!scopes.length ? (
        <Empty title="You haven't been given any classes yet">An admin assigns teachers to subjects and sections under Classes. Once that’s done, your classes appear here.</Empty>
      ) : (
        <div className="lm-grid">
          <section className="ad-card">
            <h2>To mark</h2>
            {toMark.length || quizMark.length ? (
              <ul className="lm-list">
                {toMark.map((a) => <li key={a.id}><Link href={`/teach/assignments/${a.id}`}><strong>{a.title}</strong><span className="ad-muted">{a.lms_subjects?.name} · assignment</span></Link><span className="lm-badge">{a.open}</span></li>)}
                {quizMark.map((q) => <li key={q.id}><Link href={`/teach/quizzes/${q.id}?tab=results`}><strong>{q.title}</strong><span className="ad-muted">quiz, short answers</span></Link><span className="lm-badge">{q.open}</span></li>)}
              </ul>
            ) : <p className="ad-muted">Nothing waiting. Well done.</p>}
          </section>
          <section className="ad-card">
            <h2>Today, {WEEKDAYS[today]}</h2>
            {mine.length ? (
              <ul className="lm-today">
                {mine.map((p, i) => <li key={i}><span className="lm-period__time">{fmtTime(p.starts)} to {fmtTime(p.ends)}</span><strong>{p.lms_subjects?.name ?? "Break"}</strong><span className="ad-muted">{[p.lms_sections?.name, p.room].filter(Boolean).join(" · ")}</span></li>)}
              </ul>
            ) : <p className="ad-muted">No classes on the timetable today.</p>}
          </section>
          <section className="ad-card">
            <h2>Your classes</h2>
            <ul className="lm-list">
              {scopes.map((s) => <li key={s.offeringId + s.subjectId}><div><strong>{s.subject}</strong><span className="ad-muted">{s.code ?? s.course} · {s.sections.map((x) => x.name).join(", ")}</span></div></li>)}
            </ul>
          </section>
          <section className="ad-card">
            <h2>Recently posted</h2>
            {(posts ?? []).length ? (
              <ul className="lm-list">
                {((posts ?? []) as unknown as { id: string; kind: string; title: string; created_at: string; lms_subjects: { name: string } | null }[]).map((p) => (
                  <li key={p.id}><Link href={`/teach/materials/${p.id}`}><strong>{p.title}</strong><span className="ad-muted">{p.kind === "announcement" ? "Announcement" : "Material"} · {p.lms_subjects?.name} · {timeAgo(p.created_at)} ago</span></Link></li>
                ))}
              </ul>
            ) : <p className="ad-muted">Nothing yet. Post your first slides with “Post material”.</p>}
            <p className="ad-muted" style={{ marginBottom: 0 }}>Times are Karachi time. Today is {fmtDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" })}.</p>
          </section>
        </div>
      )}
    </LmsShell>
  );
}
