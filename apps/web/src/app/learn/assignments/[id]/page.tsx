import Link from "next/link";
import { notFound } from "next/navigation";
import { LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { asFiles, dueLabel, fileHref, fileIcon } from "@/lib/lms";
import { requireStudent } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";
import { withdrawSubmission } from "../../actions";
import { SubmitForm } from "../../Student";

export const dynamic = "force-dynamic";

export default async function LearnAssignment({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, userId, name, isTeacher } = await requireStudent();
  const { id } = await params;
  const [{ data: a }, { data: sub }] = await Promise.all([
    supabase.from("lms_assignments").select("*, lms_subjects(name)").eq("id", id).maybeSingle(),
    supabase.from("lms_submissions").select("*").eq("assignment_id", id).eq("user_id", userId).maybeSingle(),
  ]);
  if (!a) notFound();
  const subject = (a as unknown as { lms_subjects: { name: string } | null }).lms_subjects?.name;
  const past = new Date(a.due_at) < new Date();
  const files = asFiles(a.files);
  const marked = !!sub?.marked_at;
  const canSubmit = !marked && (!past || a.allow_late);
  const late = sub && new Date(sub.submitted_at) > new Date(a.due_at);
  return (
    <LmsShell mode="learn" current="/learn/assignments" name={name} other={isTeacher}>
      <LmsHead title={a.title} crumb={<Link href="/learn/assignments">Assignments</Link>}
        sub={<>{subject} · due {fmtDate(a.due_at, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })} <span className={`lm-due${past ? " is-over" : ""}`}>{dueLabel(a.due_at)}</span> · out of {Number(a.max_marks)}</>} />
      <div className="ad-grid">
        <article className="ad-card lm-article">
          <h2>Instructions</h2>
          {a.instructions ? <div className="lm-post__body lm-post__body--full" dir="auto">{a.instructions}</div> : <p className="ad-muted">No written instructions. See the attachments or ask your teacher.</p>}
          {files.length > 0 && <div className="lm-attach">{files.map((f) => <a key={f.path} href={fileHref(f)} target="_blank" rel="noreferrer" className="lm-attach__item"><span className="lm-ficon">{fileIcon(f.name)}</span>{f.name}</a>)}</div>}
        </article>
        <aside className="ad-form__col">
          {marked && (
            <section className="ad-card lm-result">
              <h2>Marked</h2>
              <div className="lm-result__score"><strong>{Number(sub!.marks)}</strong><span>/ {Number(a.max_marks)}</span></div>
              {sub!.feedback && <p className="lm-feedback" dir="auto">{sub!.feedback}</p>}
            </section>
          )}
          <section className="ad-card">
            <h2>{sub ? "Your work" : "Hand in"}</h2>
            {sub && <p className="ad-muted">Handed in {fmtDate(sub.submitted_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{late ? " (late)" : ""}.{!marked && canSubmit ? " You can still change it until it's marked." : ""}</p>}
            {marked ? (
              <>
                {sub!.body && <div className="lm-answer" dir="auto">{sub!.body}</div>}
                {asFiles(sub!.files).length > 0 && <div className="lm-attach">{asFiles(sub!.files).map((f) => <a key={f.path} href={fileHref(f)} target="_blank" rel="noreferrer" className="lm-attach__item"><span className="lm-ficon">{fileIcon(f.name)}</span>{f.name}</a>)}</div>}
              </>
            ) : (
              <SubmitForm assignmentId={id} body={sub?.body ?? ""} files={asFiles(sub?.files)} canSubmit={canSubmit} resubmit={!!sub}
                closedNote="The due date has passed and late work isn't accepted for this assignment. Speak to your teacher if you need more time." />
            )}
            {sub && !marked && canSubmit && <form action={withdrawSubmission} style={{ marginTop: 10 }}><input type="hidden" name="assignment_id" value={id} /><button className="ad-icon-btn ad-icon-btn--danger">Withdraw my submission</button></form>}
          </section>
        </aside>
      </div>
    </LmsShell>
  );
}
