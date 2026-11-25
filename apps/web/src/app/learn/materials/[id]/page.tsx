import Link from "next/link";
import { notFound } from "next/navigation";
import { LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { asFiles, asLinks, fileHref, fileIcon, fmtSize } from "@/lib/lms";
import { requireStudent } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LearnPost({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, name, isTeacher } = await requireStudent();
  const { id } = await params;
  const { data: p } = await supabase.from("lms_posts").select("*, lms_subjects(name), offerings(title)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const px = p as unknown as typeof p & { lms_subjects: { name: string } | null; offerings: { title: string } | null };
  const { data: author } = p.created_by ? await supabase.from("profiles").select("full_name").eq("id", p.created_by).maybeSingle() : { data: null };
  const files = asFiles(p.files); const links = asLinks(p.links);
  return (
    <LmsShell mode="learn" current="/learn/materials" name={name} other={isTeacher}>
      <LmsHead title={p.title} crumb={<Link href="/learn/materials">Materials</Link>}
        sub={[px.offerings?.title, px.lms_subjects?.name, p.topic, author?.full_name ? `by ${author.full_name}` : null, fmtDate(p.created_at, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })].filter(Boolean).join(" · ")} />
      <article className="ad-card lm-article">
        {p.kind === "announcement" && <span className="ad-pill ad-pill--waitlisted">Announcement</span>}
        {p.body && <div className="lm-post__body lm-post__body--full" dir="auto">{p.body}</div>}
        {files.length > 0 && (
          <ul className="lm-files lm-files--big">
            {files.map((f) => (
              <li key={f.path}>
                <span className="lm-ficon">{fileIcon(f.name)}</span>
                <a href={fileHref(f)} target="_blank" rel="noreferrer" className="lm-fname">{f.name}</a>
                <span className="ad-muted">{fmtSize(f.size)}</span>
                <a href={`${fileHref(f)}&dl=1`} className="ad-icon-btn">Download</a>
              </li>
            ))}
          </ul>
        )}
        {links.length > 0 && <div className="lm-attach">{links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="lm-attach__item"><span className="lm-ficon">Link</span>{l.label}</a>)}</div>}
      </article>
    </LmsShell>
  );
}
