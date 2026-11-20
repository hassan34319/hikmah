import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { NewFieldForm } from "../../../fields/NewFieldForm";
import { TYPE_LABELS } from "@/lib/field-types";
import { OfferingTabs } from "../tabs";
import { formFieldAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Form" };

export default async function FormBuilder({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const [{ data: offering }, { data: rows }, { data: library }] = await Promise.all([
    supabase.from("offerings").select("id, title, slug, offering_types(kind)").eq("id", id).maybeSingle(),
    supabase.from("form_fields").select("id, position, required, fields(id, key, label, type, options, profile_column)").eq("offering_id", id).order("position"),
    supabase.from("fields").select("id, key, label, type, profile_column, is_system").order("is_system", { ascending: false }).order("label"),
  ]);
  if (!offering) notFound();
  const kind = (offering as unknown as { offering_types: { kind: "course" | "event" } | null }).offering_types?.kind ?? "event";
  type Q = { id: string; position: number; required: boolean; fields: { id: string; key: string; label: string; type: string; options: unknown; profile_column: string | null } | null };
  const questions = (rows ?? []) as unknown as Q[];
  const used = new Set(questions.map((q) => q.fields?.id));
  const available = (library ?? []).filter((f) => !used.has(f.id));

  const Btn = ({ op, qid, label, danger, title }: { op: string; qid: string; label: string; danger?: boolean; title: string }) => (
    <form action={formFieldAction}>
      <input type="hidden" name="offering_id" value={id} /><input type="hidden" name="id" value={qid} /><input type="hidden" name="op" value={op} />
      <button className={`ad-icon-btn${danger ? " ad-icon-btn--danger" : ""}`} title={title} aria-label={title}>{label}</button>
    </form>
  );

  return (
    <AdminShell isAdmin current="/admin/offerings">
      <AdminHeader title={offering.title} crumb={<><Link href="/admin/offerings">Courses and events</Link> / Form</>}
        actions={<Link href={`/register/${offering.slug}`} target="_blank" className="hk-btn hk-btn--ghost hk-btn--sm">Preview form ↗</Link>} />
      <OfferingTabs id={id} current="form" kind={kind} />
      <div className="ad-grid">
        <section className="ad-card">
          <div className="ad-card__head"><h2>Questions on this form</h2><span className="ad-muted">{questions.length} questions</span></div>
          <p className="ad-muted" style={{ marginTop: -6 }}>Questions marked <span className="ad-tag ad-tag--profile">From profile</span> are filled in automatically from the person&apos;s account. They only answer the rest.</p>
          {questions.map((q, i) => (
            <div key={q.id} className="ad-q">
              <span className="ad-q__num">{i + 1}</span>
              <div>
                <strong style={{ fontSize: 15 }}>{q.fields?.label}</strong>
                <div className="ad-q__meta">
                  {q.fields?.profile_column ? <span className="ad-tag ad-tag--profile">From profile</span> : <span className="ad-tag">{TYPE_LABELS[q.fields?.type ?? ""] ?? q.fields?.type}</span>}
                  {" "}{q.required ? "Required" : "Optional"}
                  {Array.isArray(q.fields?.options) && (q.fields!.options as string[]).length > 0 && <> · {(q.fields!.options as string[]).join(", ")}</>}
                </div>
              </div>
              <div className="ad-q__tools">
                <Btn op="up" qid={q.id} label="↑" title="Move up" />
                <Btn op="down" qid={q.id} label="↓" title="Move down" />
                <Btn op="required" qid={q.id} label={q.required ? "Make optional" : "Make required"} title="Toggle required" />
                <Btn op="remove" qid={q.id} label="Remove" danger title="Remove from form" />
              </div>
            </div>
          ))}
          {questions.length === 0 && <div className="ad-alert">No questions yet. People will only confirm their saved details.</div>}
        </section>

        <div style={{ display: "grid", gap: 20 }}>
          <section className="ad-card">
            <h2>Add from the question library</h2>
            <form action={formFieldAction} className="ad-fields">
              <input type="hidden" name="offering_id" value={id} /><input type="hidden" name="op" value="add" />
              <select name="field_id" className="ad-input" required defaultValue="">
                <option value="" disabled>Choose a question…</option>
                {available.map((f) => <option key={f.id} value={f.id}>{f.label}{f.profile_column ? " (from profile)" : ""}</option>)}
              </select>
              <label className="ad-switch">Required<input type="checkbox" name="required" defaultChecked /></label>
              <button className="hk-btn hk-btn--ghost hk-btn--sm" style={{ justifySelf: "start" }}>Add question</button>
            </form>
          </section>
          <section className="ad-card">
            <h2>Or write a new question</h2>
            <NewFieldForm attachTo={id} />
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
