import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminShell, StatusPill } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Courses and events" };

const KINDS = [["all", "All"], ["event", "Events"], ["course", "Courses"]] as const;
const STATUSES = [["active", "Live and drafts"], ["published", "Published"], ["draft", "Drafts"], ["past", "Past and archived"]] as const;

export default async function OfferingsList({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string; q?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const kind = sp.kind ?? "all";
  const status = sp.status ?? "active";
  const q = (sp.q ?? "").trim();
  const nowIso = new Date().toISOString();

  let query = supabase.from("offerings")
    .select("id, slug, title, subtitle, status, pinned, capacity, starts_at, ends_at, poster_url, updated_at, offering_types!inner(kind, name)")
    .order("pinned", { ascending: false })
    .order("starts_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false });
  if (kind === "event" || kind === "course") query = query.eq("offering_types.kind", kind);
  if (status === "published") query = query.eq("status", "published");
  if (status === "draft") query = query.eq("status", "draft");
  if (status === "active") query = query.in("status", ["published", "draft"]).or(`ends_at.is.null,ends_at.gt.${nowIso}`);
  if (status === "past") query = query.or(`status.in.(closed,archived),ends_at.lt.${nowIso}`);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query;

  type Row = { id: string; slug: string; title: string; subtitle: string | null; status: string; pinned: boolean; capacity: number | null; starts_at: string | null; poster_url: string | null; offering_types: { kind: string; name: string } };
  const rows = (data ?? []) as unknown as Row[];
  const ids = rows.map((r) => r.id);
  const { data: regs } = ids.length
    ? await supabase.from("registrations").select("offering_id, status").in("offering_id", ids).neq("status", "cancelled")
    : { data: [] as { offering_id: string; status: string }[] };
  const counts = new Map<string, number>();
  for (const r of regs ?? []) counts.set(r.offering_id, (counts.get(r.offering_id) ?? 0) + 1);

  const link = (k: string, s: string) => `/admin/offerings?kind=${k}&status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <AdminShell isAdmin current="/admin/offerings">
      <AdminHeader
        title="Courses and events"
        actions={<>
          <Link href="/admin/offerings/new?kind=course" className="hk-btn hk-btn--ghost hk-btn--sm">New course</Link>
          <Link href="/admin/offerings/new?kind=event" className="hk-btn hk-btn--primary hk-btn--sm">+ New event</Link>
        </>}
      />
      <div className="ad-filters">
        {KINDS.map(([k, label]) => <Link key={k} href={link(k, status)} className="ad-chip" aria-current={kind === k}>{label}</Link>)}
        <span style={{ width: 12 }} />
        {STATUSES.map(([s, label]) => <Link key={s} href={link(kind, s)} className="ad-chip" aria-current={status === s}>{label}</Link>)}
        <form style={{ marginLeft: "auto" }}>
          <input type="hidden" name="kind" value={kind} /><input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Search titles" className="ad-input" style={{ width: 220 }} />
        </form>
      </div>
      <section className="ad-card" style={{ padding: 0 }}>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr><th style={{ width: 64 }} /><th>Title</th><th>Type</th><th>Date</th><th>Status</th><th>Registrations</th><th /></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {o.poster_url ? <img src={o.poster_url} alt="" style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ width: 52, height: 40, borderRadius: 8, background: "#EEF1F5" }} />}
                  </td>
                  <td><Link href={`/admin/offerings/${o.id}`}>{o.title}</Link>{o.pinned && <span className="ad-tag" style={{ marginLeft: 8 }}>Pinned</span>}<div className="ad-muted">{o.subtitle}</div></td>
                  <td className="ad-muted">{o.offering_types.name}</td>
                  <td className="ad-muted">{o.starts_at ? fmtDate(o.starts_at) : "No date"}</td>
                  <td><StatusPill status={o.status} /></td>
                  <td>
                    <Link href={`/admin/offerings/${o.id}/responses`}>{counts.get(o.id) ?? 0}{o.capacity ? ` / ${o.capacity}` : ""}</Link>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link href={`/${o.offering_types.kind === "course" ? "courses" : "events"}/${o.slug}`} className="ad-muted" target="_blank">View ↗</Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="ad-muted" style={{ padding: 24 }}>Nothing here yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
