import Link from "next/link";
import { notFound } from "next/navigation";
import { LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { asFiles, dueLabel, fileHref, fileIcon, fmtSize } from "@/lib/lms";
import { requireTeacher } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";
import { deleteAssignment } from "../../actions";
import { MarkForm } from "../../Editors";

export const dynamic = "force-dynamic";

export default async function AssignmentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; show?: string }> }) {
  const { supabase, name, isAdmin } = await requireTeacher();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { data: a } = await supabase.from("lms_assignments").select("*, lms_subjects(name), lms_assignment_sections(section_id, lms_sections(name))").eq("id", id).maybeSingle();
  if (!a) notFound();
  type X = { lms_subjects: { name: string } | null; lms_assignment_sections: { section_id: string; lms_sections: { name: string } | null }[] };
  const ax = a as unknown as typeof a & X;
  const sections = ax.lms_assignment_sections.map((s) => s.section_id);
  const [{ data: subs }, { data: enrol }] = await Promise.all([
    supabase.from("lms_submissions").select("*").eq("assignment_id", id),
    sections.length ? supabase.from("lms_enrolments").select("user_id, section_id, lms_sections(name), profiles(full_name, email)").in("section_id", sections).is("ended_at", null) : Promise.resolve({ data: [] }),
  ]);
  type E = { user_id: string; section_id: string; lms_sections: { name: string } | null; profiles: { full_name: string | null; email: string } | null };
  const students = ((enrol ?? []) as unknown as E[]).sort((x, y) => (x.profiles?.full_name ?? "").localeCompare(y.profiles?.full_name ?? ""));
  const byUser = new Map((subs ?? []).map((s) => [s.user_id, s]));
  const handed = students.filter((s) => byUser.has(s.user_id));
  const missing = students.filter((s) => !byUser.has(s.user_id));
  const marked = handed.filter((s) => byUser.get(s.user_id)?.marked_at).length;
  const show = sp.show === "marked" || sp.show === "all" ? sp.show : "open";
  const rows = handed.filter((s) => show === "all" || (show === "marked" ? !!byUser.get(s.user_id)?.marked_at : !byUser.get(s.user_id)?.marked_at));
  const files = asFiles(a.files);
  const max = Number(a.max_marks);

  return (
    <LmsShell mode="teach" current="/teach/assignments" name={name} admin={isAdmin} other>
      <LmsHead title={a.title} crumb={<Link href="/teach/assignments">Assignments</Link>}
        sub={<>{ax.lms_subjects?.name} · {ax.lms_assignment_sections.map((s) => s.lms_sections?.name).join(", ")} · due {fmtDate(a.due_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} ({dueLabel(a.due_at)}) · out of {max}</>}
        actions={<><Link href={`/teach/assignments/${id}/edit`} className="hk-btn hk-btn--ghost hk-btn--sm">Edit</Link>
          <form action={deleteAssignment}><input type="hidden" name="id" value={id} /><button className="ad-icon-btn ad-icon-btn--danger">Delete</button></form></>} />
      {sp.saved && <div className="ad-alert ad-alert--ok" role="status">Assignment saved.</div>}
      <div className="lm-stats">
        <div><strong>{handed.length}</strong><span>handed in</span></div>
        <div><strong>{missing.length}</strong><span>not yet</span></div>
        <div><strong>{marked}</strong><span>marked</span></div>
        <div><strong>{handed.length - marked}</strong><span>to mark</span></div>
      </div>
      {(a.instructions || files.length > 0) && (
        <details className="ad-card lm-details"><summary>Instructions{files.length ? ` and ${files.length} attachment${files.length > 1 ? "s" : ""}` : ""}</summary>
          {a.instructions && <p className="lm-post__body" dir="auto">{a.instructions}</p>}
          {files.length > 0 && <div className="lm-attach">{files.map((f) => <a key={f.path} href={fileHref(f)} target="_blank" rel="noreferrer" className="lm-attach__item"><span className="lm-ficon">{fileIcon(f.name)}</span>{f.name}</a>)}</div>}
        </details>
      )}
      <section className="ad-card" style={{ padding: 0 }}>
        <div className="lm-cardhead">
          <h2>Submissions</h2>
          <div className="ad-filters">
            {(["open", "marked", "all"] as const).map((k) => <Link key={k} href={`/teach/assignments/${id}${k === "open" ? "" : `?show=${k}`}`} className="ad-chip" aria-current={show === k ? "page" : undefined}>{k === "open" ? `To mark (${handed.length - marked})` : k === "marked" ? `Marked (${marked})` : `All (${handed.length})`}</Link>)}
          </div>
        </div>
        {rows.length ? (
          <ul className="lm-subs">
            {rows.map((st) => {
              const sub = byUser.get(st.user_id)!;
              const late = new Date(sub.submitted_at) > new Date(a.due_at);
              const sf = asFiles(sub.files);
              return (
                <li key={st.user_id} className="lm-sub">
                  <div className="lm-sub__who">
                    <strong>{st.profiles?.full_name ?? st.profiles?.email}</strong>
                    <span className="ad-muted">{st.lms_sections?.name} · {fmtDate(sub.submitted_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{late && <span className="lm-late"> late</span>}</span>
                  </div>
                  <div className="lm-sub__work">
                    {sub.body && <p dir="auto">{sub.body}</p>}
                    {sf.length > 0 && <div className="lm-attach">{sf.map((f) => <a key={f.path} href={fileHref(f)} target="_blank" rel="noreferrer" className="lm-attach__item"><span className="lm-ficon">{fileIcon(f.name)}</span>{f.name} <span className="ad-muted">{fmtSize(f.size)}</span></a>)}</div>}
                  </div>
                  <MarkForm assignmentId={id} submissionId={sub.id} max={max} marks={sub.marks != null ? Number(sub.marks) : null} feedback={sub.feedback} />
                </li>
              );
            })}
          </ul>
        ) : <p className="ad-muted" style={{ padding: "14px 18px", margin: 0 }}>{show === "open" ? "Nothing waiting to be marked." : "No submissions here yet."}</p>}
      </section>
      {missing.length > 0 && (
        <section className="ad-card">
          <h2>Not handed in yet <span className="lm-count">{missing.length}</span></h2>
          <p className="lm-names">{missing.map((s) => `${s.profiles?.full_name ?? s.profiles?.email} (${s.lms_sections?.name})`).join(", ")}</p>
        </section>
      )}
    </LmsShell>
  );
}
