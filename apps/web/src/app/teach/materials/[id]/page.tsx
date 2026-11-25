import Link from "next/link";
import { notFound } from "next/navigation";
import { LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { asFiles, asLinks } from "@/lib/lms";
import { requireTeacher } from "@/lib/lms-server";
import { PostEditor } from "../../Editors";

export const dynamic = "force-dynamic";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, name, isAdmin, scopes } = await requireTeacher();
  const { id } = await params;
  const { data: p } = await supabase.from("lms_posts").select("*, lms_post_sections(section_id)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const scope = `${p.offering_id}|${p.subject_id}`;
  if (!scopes.some((s) => `${s.offeringId}|${s.subjectId}` === scope)) notFound();
  const { data: t } = await supabase.from("lms_posts").select("topic").eq("offering_id", p.offering_id).not("topic", "is", null).limit(100);
  const links = asLinks(p.links).map((l) => (l.label && l.label !== l.url ? `${l.label} | ${l.url}` : l.url)).join("\n");
  return (
    <LmsShell mode="teach" current="/teach/materials" name={name} admin={isAdmin} other>
      <LmsHead title={p.kind === "announcement" ? "Edit announcement" : "Edit material"} crumb={<Link href="/teach/materials">Materials</Link>} />
      <PostEditor scopes={scopes} topics={[...new Set((t ?? []).map((x) => x.topic as string))]}
        draft={{ id: p.id, kind: p.kind, scope, sections: ((p as unknown as { lms_post_sections: { section_id: string }[] }).lms_post_sections ?? []).map((x) => x.section_id), title: p.title, topic: p.topic ?? "", body: p.body ?? "", files: asFiles(p.files), links }} />
    </LmsShell>
  );
}
