import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { requireTeacher } from "@/lib/lms-server";
import { PostEditor } from "../../Editors";

export const dynamic = "force-dynamic";

export default async function NewPost({ searchParams }: { searchParams: Promise<{ kind?: string; s?: string }> }) {
  const { supabase, name, isAdmin, scopes } = await requireTeacher();
  const sp = await searchParams;
  const kind = sp.kind === "announcement" ? "announcement" : "material";
  const { data } = scopes.length ? await supabase.from("lms_posts").select("topic").in("offering_id", [...new Set(scopes.map((s) => s.offeringId))]).not("topic", "is", null).order("created_at", { ascending: false }).limit(100) : { data: [] };
  const topics = [...new Set((data ?? []).map((t) => t.topic as string))];
  return (
    <LmsShell mode="teach" current="/teach/materials" name={name} admin={isAdmin} other>
      <LmsHead title={kind === "announcement" ? "New announcement" : "Post material"} crumb={<Link href="/teach/materials">Materials</Link>}
        sub={kind === "announcement" ? "Shows at the top of My classes for the sections you choose, and can be emailed." : "Upload slides or notes once and share them with all the sections you choose."} />
      {scopes.length ? <PostEditor scopes={scopes} topics={topics} draft={{ kind, scope: sp.s, sections: [], title: "", topic: "", body: "", files: [], links: "" }} /> : <Empty title="No classes yet">An admin needs to assign you to a subject first.</Empty>}
    </LmsShell>
  );
}
