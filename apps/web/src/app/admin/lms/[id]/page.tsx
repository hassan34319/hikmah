import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { WEEKDAYS, WEEK_ORDER, fmtTime } from "@/lib/lms";
import { fmtDate } from "@/lib/time";
import { archiveSection, archiveSubject, deletePeriod, renameSubject, unassignTeacher, updateSection } from "./actions";
import { AddPeriodForm, AddSectionForm, AddSubjectForm, AssignTeacherForm, Roster, type RosterRow } from "./Forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Classes" };

const TABS = [["students", "Sections and students"], ["subjects", "Subjects and teachers"], ["timetable", "Timetable"]] as const;
type Tab = (typeof TABS)[number][0];

export default async function LmsCourse({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; year?: string; section?: string }> }) {
  const { supabase } = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [{ data: offering }, { data: details }, { data: allSections }] = await Promise.all([
    supabase.from("offerings").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("course_details").select("intake_year, code").eq("offering_id", id).maybeSingle(),
    supabase.from("lms_sections").select("*, venues(name)").eq("offering_id", id).order("sort").order("name"),
  ]);
  if (!offering) notFound();
  const years = [...new Set([...(allSections ?? []).map((s) => s.intake_year), details?.intake_year ?? new Date().getFullYear() + 1])].sort((a, b) => b - a);
  const year: number = years.includes(Number(sp.year)) ? Number(sp.year) : (details?.intake_year ?? years[0] ?? new Date().getFullYear() + 1);
  const tab: Tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as Tab) : "students";
  type Sec = { id: string; name: string; archived: boolean; venue_id: string | null; venues: { name: string } | null };
  const sections = ((allSections ?? []) as unknown as (Sec & { intake_year: number })[]).filter((s) => s.intake_year === year);
  const live = sections.filter((s) => !s.archived);
  const secIds = sections.map((s) => s.id);

  const [{ data: subjects }, { data: teaching }, { data: enrol }, { data: selected }, { data: venues }, { data: staff }, { data: periods }] = await Promise.all([
    supabase.from("lms_subjects").select("id, name, archived").eq("offering_id", id).order("sort").order("name"),
    secIds.length ? supabase.from("lms_teaching").select("section_id, subject_id, teacher_id").in("section_id", secIds) : Promise.resolve({ data: [] }),
    secIds.length ? supabase.from("lms_enrolments").select("user_id, section_id, started_at, profiles(full_name, email)").in("section_id", secIds).is("ended_at", null) : Promise.resolve({ data: [] }),
    supabase.from("admissions").select("user_id, student_id, profiles(full_name, email)").eq("offering_id", id).eq("stage", "selected"),
    supabase.from("venues").select("id, name").order("name"),
    supabase.from("user_roles").select("user_id").eq("role", "faculty"),
    secIds.length ? supabase.from("lms_timetable").select("*").in("section_id", secIds).order("weekday").order("starts") : Promise.resolve({ data: [] }),
  ]);
  type P = { full_name: string | null; email: string } | null;
  const facultyIds = (staff ?? []).map((t) => t.user_id);
  const { data: facultyProfiles } = facultyIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", facultyIds) : { data: [] };
  const teachers = (facultyProfiles ?? []).map((t) => ({ id: t.id, name: t.full_name || t.email || "Teacher" })).sort((a, b) => a.name.localeCompare(b.name));
  const teacherName = new Map(teachers.map((t) => [t.id, t.name]));
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const sectionName = new Map(sections.map((s) => [s.id, s.name]));
  const studentIds = new Map(((selected ?? []) as unknown as { user_id: string; student_id: string | null }[]).map((a) => [a.user_id, a.student_id]));
  const enrolled = (enrol ?? []) as unknown as { user_id: string; section_id: string; started_at: string; profiles: P }[];
  const placed = new Set(enrolled.map((e) => e.user_id));

  const filter = sp.section && secIds.includes(sp.section) ? sp.section : null;
  const roster: RosterRow[] = enrolled.filter((e) => !filter || e.section_id === filter).map((e) => ({
    userId: e.user_id, name: e.profiles?.full_name || e.profiles?.email || "", email: e.profiles?.email ?? "",
    studentId: studentIds.get(e.user_id) ?? null, section: sectionName.get(e.section_id) ?? null, sectionId: e.section_id, since: fmtDate(e.started_at, { day: "numeric", month: "short", year: "numeric" }),
  })).sort((a, b) => (a.section ?? "").localeCompare(b.section ?? "") || a.name.localeCompare(b.name));
  const waiting: RosterRow[] = ((selected ?? []) as unknown as { user_id: string; student_id: string | null; profiles: P }[]).filter((a) => !placed.has(a.user_id)).map((a) => ({
    userId: a.user_id, name: a.profiles?.full_name || a.profiles?.email || "", email: a.profiles?.email ?? "", studentId: a.student_id, section: null, sectionId: null, since: null,
  }));
  const count = (sid: string) => enrolled.filter((e) => e.section_id === sid).length;
  const href = (x: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(); for (const [k, v] of Object.entries({ tab, year, ...x } as Record<string, string | number | undefined>)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/admin/lms/${id}?${p}`;
  };
  const opts = (xs: { id: string; name: string }[]) => xs.map(({ id: i, name }) => ({ id: i, name }));
  const liveSubjects = (subjects ?? []).filter((s) => !s.archived);
  const teach = (teaching ?? []) as { section_id: string; subject_id: string; teacher_id: string }[];

  return (
    <AdminShell isAdmin current="/admin/lms">
      <AdminHeader title={offering.title} crumb={<><Link href="/admin/lms">Classes</Link> / {details?.code ?? offering.title}</>}
        sub="Set up sections, subjects and teachers, place students and build the timetable. Teachers and students see everything here in their portals."
        actions={years.length > 1 ? <div className="ad-filters">{years.map((y) => <Link key={y} href={href({ year: y, section: undefined })} className="ad-chip" aria-current={y === year ? "page" : undefined}>{y} intake</Link>)}</div> : <span className="ad-chip" aria-current="page">{year} intake</span>} />
      <nav className="ad-tabs" aria-label="Sections">
        {TABS.map(([k, label]) => <Link key={k} href={href({ tab: k, section: undefined })} aria-current={tab === k ? "page" : undefined}>{label}</Link>)}
      </nav>

      {tab === "students" && (
        <div className="lm-stack">
          <section className="ad-card">
            <h2>Sections</h2>
            {sections.length ? (
              <div className="lm-sections">
                {sections.map((s) => (
                  <div key={s.id} className={`lm-sec${s.archived ? " is-archived" : ""}`}>
                    <form action={updateSection} className="lm-sec__edit">
                      <input type="hidden" name="offering_id" value={id} /><input type="hidden" name="section_id" value={s.id} />
                      <input name="name" defaultValue={s.name} className="ad-input" aria-label="Section name" />
                      <select name="venue_id" defaultValue={s.venue_id ?? ""} className="ad-input" aria-label="Campus"><option value="">Campus not set</option>{(venues ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                      <button className="ad-icon-btn">Save</button>
                    </form>
                    <div className="lm-sec__meta">
                      <Link href={href({ section: s.id })}>{count(s.id)} {count(s.id) === 1 ? "student" : "students"}</Link>
                      <span>{new Set(teach.filter((t) => t.section_id === s.id).map((t) => t.teacher_id)).size} teachers</span>
                      <form action={archiveSection}><input type="hidden" name="offering_id" value={id} /><input type="hidden" name="section_id" value={s.id} /><input type="hidden" name="archived" value={s.archived ? "0" : "1"} />
                        <button className="ad-icon-btn">{s.archived ? "Restore" : "Archive"}</button></form>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="ad-muted">No sections for the {year} intake yet. Add the first one below, e.g. Weekdays.</p>}
            <AddSectionForm offeringId={id} year={year} venues={opts(venues ?? [])} />
          </section>

          {waiting.length > 0 && (
            <section className="ad-card" style={{ padding: 0 }}>
              <div className="lm-cardhead"><h2>Selected, not placed yet <span className="lm-count">{waiting.length}</span></h2><p className="ad-muted">Students selected in Admissions who don’t have a section. Tick them and choose a section.</p></div>
              <Roster offeringId={id} rows={waiting} sections={opts(live)} emptyText="" placeLabel="Place ticked in" />
            </section>
          )}

          <section className="ad-card" style={{ padding: 0 }}>
            <div className="lm-cardhead">
              <h2>Students <span className="lm-count">{enrolled.length}</span></h2>
              <div className="ad-filters">
                <Link href={href({ section: undefined })} className="ad-chip" aria-current={!filter ? "page" : undefined}>All</Link>
                {sections.map((s) => <Link key={s.id} href={href({ section: s.id })} className="ad-chip" aria-current={filter === s.id ? "page" : undefined}>{s.name} ({count(s.id)})</Link>)}
              </div>
            </div>
            <Roster offeringId={id} rows={roster} sections={opts(live)} emptyText="No students placed yet. Students selected in Admissions are placed in the section you pick when deciding, or from the list above." />
          </section>
        </div>
      )}

      {tab === "subjects" && (
        <div className="ad-grid">
          <section className="ad-card">
            <h2>Who teaches what</h2>
            {liveSubjects.length ? (
              <div className="ad-table-wrap">
                <table className="ad-table lm-matrix">
                  <thead><tr><th>Subject</th>{live.map((s) => <th key={s.id}>{s.name}</th>)}</tr></thead>
                  <tbody>
                    {liveSubjects.map((sub) => (
                      <tr key={sub.id}>
                        <th scope="row">{sub.name}</th>
                        {live.map((sec) => {
                          const here = teach.filter((t) => t.section_id === sec.id && t.subject_id === sub.id);
                          return (
                            <td key={sec.id}>
                              {here.length ? here.map((t) => (
                                <form key={t.teacher_id} action={unassignTeacher} className="lm-tchip">
                                  <input type="hidden" name="offering_id" value={id} /><input type="hidden" name="section_id" value={t.section_id} /><input type="hidden" name="subject_id" value={t.subject_id} /><input type="hidden" name="teacher_id" value={t.teacher_id} />
                                  <span>{teacherName.get(t.teacher_id) ?? "Teacher"}</span><button aria-label={`Remove ${teacherName.get(t.teacher_id)} from ${sub.name}, ${sec.name}`}>✕</button>
                                </form>
                              )) : <span className="ad-muted">no teacher</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="ad-muted">Add the course’s subjects first.</p>}
          </section>
          <aside className="ad-form__col">
            <section className="ad-card"><h2>Assign a teacher</h2><AssignTeacherForm offeringId={id} subjects={opts(liveSubjects)} sections={opts(live)} teachers={teachers} /></section>
            <section className="ad-card">
              <h2>Subjects</h2>
              <div className="lm-subjects">
                {(subjects ?? []).map((s) => (
                  <div key={s.id} className={`lm-subj${s.archived ? " is-archived" : ""}`}>
                    <form action={renameSubject}><input type="hidden" name="offering_id" value={id} /><input type="hidden" name="subject_id" value={s.id} />
                      <input name="name" defaultValue={s.name} className="ad-input" aria-label="Subject name" /><button className="ad-icon-btn">Save</button></form>
                    <form action={archiveSubject}><input type="hidden" name="offering_id" value={id} /><input type="hidden" name="subject_id" value={s.id} /><input type="hidden" name="archived" value={s.archived ? "0" : "1"} />
                      <button className="ad-icon-btn">{s.archived ? "Restore" : "Archive"}</button></form>
                  </div>
                ))}
              </div>
              <AddSubjectForm offeringId={id} />
            </section>
          </aside>
        </div>
      )}

      {tab === "timetable" && (
        <div className="ad-grid">
          <section className="ad-card">
            <h2>Weekly timetable</h2>
            {live.length === 0 && <p className="ad-muted">Add a section first.</p>}
            {live.map((sec) => {
              const rows = ((periods ?? []) as { id: string; section_id: string; weekday: number; starts: string; ends: string; subject_id: string | null; teacher_id: string | null; room: string | null }[]).filter((p) => p.section_id === sec.id);
              return (
                <div key={sec.id} className="lm-tt">
                  <h3>{sec.name}{sec.venues?.name ? <small> · {sec.venues.name}</small> : null}</h3>
                  {rows.length ? (
                    <div className="lm-tt__days">
                      {WEEK_ORDER.filter((d) => rows.some((r) => r.weekday === d)).map((d) => (
                        <div key={d} className="lm-tt__day">
                          <h4>{WEEKDAYS[d]}</h4>
                          {rows.filter((r) => r.weekday === d).map((r) => (
                            <div key={r.id} className="lm-period">
                              <span className="lm-period__time">{fmtTime(r.starts)} to {fmtTime(r.ends)}</span>
                              <strong>{r.subject_id ? subjectName.get(r.subject_id) : "Break"}</strong>
                              <span className="ad-muted">{[r.teacher_id ? teacherName.get(r.teacher_id) : null, r.room].filter(Boolean).join(" · ")}</span>
                              <form action={deletePeriod}><input type="hidden" name="offering_id" value={id} /><input type="hidden" name="period_id" value={r.id} /><button className="lm-x" aria-label="Delete this class">✕</button></form>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : <p className="ad-muted">Nothing scheduled yet.</p>}
                </div>
              );
            })}
          </section>
          <aside className="ad-form__col">
            <section className="ad-card"><h2>Add a class</h2><AddPeriodForm offeringId={id} subjects={opts(liveSubjects)} sections={opts(live)} teachers={teachers} /></section>
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
