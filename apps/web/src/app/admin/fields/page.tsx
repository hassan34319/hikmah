import type { Metadata } from "next";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { NewFieldForm } from "./NewFieldForm";
import { TYPE_LABELS } from "@/lib/field-types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Question library" };

export default async function FieldLibrary() {
  const { supabase } = await requireAdmin();
  const [{ data: fields }, { data: usage }] = await Promise.all([
    supabase.from("fields").select("id, key, label, type, options, profile_column, is_system").order("is_system", { ascending: false }).order("label"),
    supabase.from("form_fields").select("field_id"),
  ]);
  const uses = new Map<string, number>();
  for (const u of usage ?? []) uses.set(u.field_id, (uses.get(u.field_id) ?? 0) + 1);

  return (
    <AdminShell isAdmin current="/admin/fields">
      <AdminHeader title="Question library" sub="Questions you write once and reuse on any form. Profile questions fill in automatically from each person's account." />
      <div className="ad-grid">
        <section className="ad-card" style={{ padding: 0 }}>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Question</th><th>Answer type</th><th>Used on</th></tr></thead>
              <tbody>
                {(fields ?? []).map((f) => (
                  <tr key={f.id}>
                    <td><strong>{f.label}</strong>{f.profile_column && <span className="ad-tag ad-tag--profile" style={{ marginLeft: 8 }}>From profile</span>}
                      {Array.isArray(f.options) && f.options.length > 0 && <div className="ad-muted">{(f.options as string[]).join(" · ")}</div>}</td>
                    <td className="ad-muted">{TYPE_LABELS[f.type] ?? f.type}</td>
                    <td className="ad-muted">{uses.get(f.id) ?? 0} forms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="ad-card"><h2>New question</h2><NewFieldForm /></section>
      </div>
    </AdminShell>
  );
}
