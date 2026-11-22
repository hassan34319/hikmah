import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { removeRole } from "./actions";
import { AddStaff } from "./AddStaff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admins" };

const LABEL: Record<string, string> = { super_admin: "Super admin", admin: "Admin", volunteer: "Volunteer", faculty: "Faculty", interviewer: "Interviewer", student: "Student" };
const STAFF = ["super_admin", "admin", "interviewer", "volunteer"];

export default async function Admins() {
  const { supabase, roles, userId } = await requireAdmin();
  const isSuper = roles.includes("super_admin");
  const { data } = await supabase.rpc("staff_list");
  const staff = (data ?? []).map((s) => ({ ...s, roles: s.roles.filter((r) => STAFF.includes(r)) })).filter((s) => s.roles.length);

  return (
    <AdminShell isAdmin current="/admin/admins">
      <AdminHeader title="Admins" sub="Who can open this dashboard. Volunteers only see door check-in. Interviewers only see the Interviews page, where they score the applicants who booked with them. Admins see everything except this page's controls. Super admins can add and remove people here." />
      <div className="ad-grid">
        <section className="ad-card" style={{ padding: 0 }}>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Name</th><th>Access</th>{isSuper && <th />}</tr></thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.user_id}>
                    <td><Link href={`/admin/people/${s.user_id}`}>{s.full_name ?? s.email}</Link><div className="ad-muted">{s.email}{s.user_id === userId ? " · you" : ""}</div></td>
                    <td><div className="ad-filters">{s.roles.map((r) => <span key={r} className={`ad-pill ad-pill--${r === "super_admin" ? "confirmed" : r === "admin" ? "draft" : r === "interviewer" ? "interviewer" : "waitlisted"}`}>{LABEL[r]}</span>)}</div></td>
                    {isSuper && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {s.roles.filter((r) => !(s.user_id === userId && r === "super_admin")).map((r) => (
                            <form key={r} action={removeRole}>
                              <input type="hidden" name="email" value={s.email} /><input type="hidden" name="role" value={r} /><input type="hidden" name="grant" value="0" />
                              <button className="ad-icon-btn ad-icon-btn--danger">Remove {LABEL[r]?.toLowerCase()}</button>
                            </form>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="ad-card">
          <h2>Add someone</h2>
          {isSuper ? <AddStaff /> : <p className="ad-muted" style={{ margin: 0 }}>Only super admins can add or remove access. Ask one of them if someone new needs to help.</p>}
        </aside>
      </div>
    </AdminShell>
  );
}
