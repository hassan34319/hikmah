import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { asFiles, asLinks, fileHref, fileIcon } from "@/lib/lms";
import { requireTeacher } from "@/lib/lms-server";
import { fmtDate } from "@/lib/time";
import { deletePost } from "../actions";

export const dynamic = "force-dynamic";

export default async function TeachMaterials({ searchParams }: { searchParams: Promise<{ s?: string; kind?: string; saved?: string }> }) {
  const { supabase, name, isAdmin, scopes } = await requireTeacher();
  const sp = await searchParams;
  const scope = scopes.find((s) => `${s.offeringId}|${s.subjectId}` === sp.s);
  const offerings = [...new Set(scopes.map((s) => s.offeringId))];
  let q = supabase.from("lms_posts").select("*, lms_subjects(name), lms_post_sections(section_id, lms_sections(name))").order("created_at", { ascending: false }).limit(200);
  q = scope ? q.eq("offering_id", scope.offeringId).eq("subject_id", scope.subjectId) : offerings.length ? q.in("offering_id", offerings) : q.eq("offering_id", "00000000-0000-0000-0000-000000000000");
  if (sp.kind === "material" || sp.kind === "announcement") q = q.eq("kind", sp.kind);
  const { data } = await q;
  type P = { id: string; kind: string; title: string; topic: string | null; body: string | null; files: unknown; links: unknown; created_at: string; subject_id: string | null; offering_id: string; lms_subjects: { name: string } | null; lms_post_sections: { lms_sections: { name: string } | null }[] };
  const posts = ((data ?? []) as unknown as P[]).filter((p) => isAdmin || scopes.some((s) => s.offeringId === p.offering_id && s.subjectId === p.subject_id));
  const href = (x: Record<string, string | undefined>) => {
    const p = new URLSearchParams(); for (const [k, v] of Object.entries({ s: sp.s, kind: sp.kind, ...x })) if (v) p.set(k, v);
    const s = p.toString(); return `/teach/materials${s ? `?${s}` : ""}`;
  };

  return (
    <LmsShell mode="teach" current="/teach/materials" name={name} admin={isAdmin} other>
      <LmsHead title="Materials and announcements" sub="Slides, notes, links and notices for your sections. Post once to several sections at a time."
        actions={<><Link href={`/teach/materials/new${sp.s ? `?s=${encodeURIComponent(sp.s)}` : ""}`} className="hk-btn hk-btn--primary hk-btn--sm">Post material</Link><Link href={`/teach/materials/new?kind=announcement${sp.s ? `&s=${encodeURIComponent(sp.s)}` : ""}`} className="hk-btn hk-btn--ghost hk-btn--sm">Announce</Link></>} />
      {sp.saved && <div className="ad-alert ad-alert--ok" role="status">{sp.saved === "announcement" ? "Announcement posted." : "Material posted."}</div>}
      <div className="ad-filters lm-filter">
        <Link href={href({ s: undefined })} className="ad-chip" aria-current={!scope ? "page" : undefined}>All subjects</Link>
        {scopes.map((s) => { const v = `${s.offeringId}|${s.subjectId}`; return <Link key={v} href={href({ s: v })} className="ad-chip" aria-current={sp.s === v ? "page" : undefined}>{s.code ? `${s.code} · ` : ""}{s.subject}</Link>; })}
        <span className="lm-filter__sep" />
        {(["", "material", "announcement"] as const).map((k) => <Link key={k} href={href({ kind: k || undefined })} className="ad-chip" aria-current={(sp.kind ?? "") === k ? "page" : undefined}>{k === "" ? "Both" : k === "material" ? "Materials" : "Announcements"}</Link>)}
      </div>
      {posts.length ? (
        <ul className="lm-posts">
          {posts.map((p) => {
            const files = asFiles(p.files as never); const links = asLinks(p.links as never);
            return (
              <li key={p.id} className={`ad-card lm-post lm-post--${p.kind}`}>
                <div className="lm-post__meta">
                  <span className={`ad-pill ad-pill--${p.kind === "announcement" ? "waitlisted" : "draft"}`}>{p.kind === "announcement" ? "Announcement" : "Material"}</span>
                  <span>{p.lms_subjects?.name}{p.topic ? ` · ${p.topic}` : ""}</span>
                  <span>{p.lms_post_sections.map((x) => x.lms_sections?.name).filter(Boolean).join(", ")}</span>
                  <span>{fmtDate(p.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <h3>{p.title}</h3>
                {p.body && <p className="lm-post__body" dir="auto">{p.body.length > 280 ? `${p.body.slice(0, 280)}…` : p.body}</p>}
                {(files.length > 0 || links.length > 0) && (
                  <div className="lm-attach">
                    {files.map((f) => <a key={f.path} href={fileHref(f)} target="_blank" rel="noreferrer" className="lm-attach__item"><span className="lm-ficon">{fileIcon(f.name)}</span>{f.name}</a>)}
                    {links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="lm-attach__item"><span className="lm-ficon">Link</span>{l.label}</a>)}
                  </div>
                )}
                <div className="lm-post__tools">
                  <Link href={`/teach/materials/${p.id}`} className="ad-icon-btn">Edit</Link>
                  <form action={deletePost}><input type="hidden" name="id" value={p.id} /><button className="ad-icon-btn ad-icon-btn--danger">Delete</button></form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <Empty title="Nothing posted yet">Use “Post material” to share slides or notes, or “Announce” for a notice.</Empty>}
    </LmsShell>
  );
}
