import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { asFiles, asLinks, fileHref, fileIcon } from "@/lib/lms";
import { requireStudent } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LearnMaterials({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { supabase, name, enrolments, isTeacher } = await requireStudent();
  const sp = await searchParams;
  const { data } = enrolments.length ? await supabase.from("lms_posts").select("id, kind, title, topic, body, files, links, created_at, subject_id, lms_subjects(name, sort)").order("created_at", { ascending: false }).limit(300) : { data: [] };
  type P = { id: string; kind: string; title: string; topic: string | null; body: string | null; files: unknown; links: unknown; created_at: string; subject_id: string | null; lms_subjects: { name: string; sort: number } | null };
  const posts = (data ?? []) as unknown as P[];
  const subjects = [...new Map(posts.filter((p) => p.subject_id).map((p) => [p.subject_id!, p.lms_subjects])).entries()].sort((a, b) => (a[1]?.sort ?? 0) - (b[1]?.sort ?? 0));
  const shown = posts.filter((p) => !sp.subject || p.subject_id === sp.subject);
  const group = (p: P) => (p.kind === "announcement" ? "Announcements" : p.topic || "Other");
  const topics = [...new Set(shown.map(group))].sort((a, b) => Number(b === "Announcements") - Number(a === "Announcements") || Number(a === "Other") - Number(b === "Other"));
  return (
    <LmsShell mode="learn" current="/learn/materials" name={name} other={isTeacher}>
      <LmsHead title="Materials" sub="Slides, notes, links and announcements from your teachers." />
      {subjects.length > 1 && (
        <div className="ad-filters lm-filter">
          <Link href="/learn/materials" className="ad-chip" aria-current={!sp.subject ? "page" : undefined}>All subjects</Link>
          {subjects.map(([id, s]) => <Link key={id} href={`/learn/materials?subject=${id}`} className="ad-chip" aria-current={sp.subject === id ? "page" : undefined}>{s?.name}</Link>)}
        </div>
      )}
      {shown.length ? topics.map((t) => (
        <section key={t} className="lm-topic">
          <h2>{t}</h2>
          <ul className="lm-posts">
            {shown.filter((p) => group(p) === t).map((p) => {
              const files = asFiles(p.files as never); const links = asLinks(p.links as never);
              return (
                <li key={p.id} className={`ad-card lm-post lm-post--${p.kind}`}>
                  <div className="lm-post__meta">
                    {p.kind === "announcement" && <span className="ad-pill ad-pill--waitlisted">Announcement</span>}
                    <span>{p.lms_subjects?.name}</span><span>{fmtDate(p.created_at, { day: "numeric", month: "short" })}</span>
                  </div>
                  <h3><Link href={`/learn/materials/${p.id}`}>{p.title}</Link></h3>
                  {p.body && <p className="lm-post__body" dir="auto">{p.body.length > 220 ? `${p.body.slice(0, 220)}…` : p.body}</p>}
                  {(files.length > 0 || links.length > 0) && (
                    <div className="lm-attach">
                      {files.map((f) => <a key={f.path} href={fileHref(f)} target="_blank" rel="noreferrer" className="lm-attach__item"><span className="lm-ficon">{fileIcon(f.name)}</span>{f.name}</a>)}
                      {links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="lm-attach__item"><span className="lm-ficon">Link</span>{l.label}</a>)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )) : <Empty title="Nothing here yet">When your teachers post slides or notes, they show up here.</Empty>}
    </LmsShell>
  );
}
