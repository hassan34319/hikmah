import "server-only";
import type { StaffContext } from "@/lib/admin";

export type ResponseRow = {
  id: string; status: string; answers: Record<string, unknown>; ticket_code: string | null; checked_in_at: string | null;
  admin_notes: string | null; submitted_at: string; user_id: string;
  profiles: {
    full_name: string | null; email: string; phone: string | null; gender: string | null; cnic: string | null; date_of_birth: string | null;
    occupation_type: string | null; university: string | null; degree: string | null; education_year: string | null; company: string | null;
    job_title: string | null; area: string | null; address_line: string | null; interests: string[]; heard_from: string | null;
  } | null;
};

export async function loadResponses(supabase: StaffContext["supabase"], offeringId: string) {
  const [{ data: offering }, { data: regs }, { data: questions }] = await Promise.all([
    supabase.from("offerings").select("id, title, slug, capacity, starts_at, qr_tickets_enabled, offering_types(kind, name)").eq("id", offeringId).maybeSingle(),
    supabase.from("registrations")
      .select("id, status, answers, ticket_code, checked_in_at, admin_notes, submitted_at, user_id, profiles(full_name, email, phone, gender, cnic, date_of_birth, occupation_type, university, degree, education_year, company, job_title, area, address_line, interests, heard_from)")
      .eq("offering_id", offeringId).order("submitted_at", { ascending: true }),
    supabase.from("form_fields").select("position, fields(key, label, profile_column)").eq("offering_id", offeringId).order("position"),
  ]);
  type Q = { fields: { key: string; label: string; profile_column: string | null } | null };
  const custom = ((questions ?? []) as unknown as Q[]).flatMap((q) => (q.fields && !q.fields.profile_column ? [q.fields] : []));
  return {
    offering: offering as unknown as ({ id: string; title: string; slug: string; capacity: number | null; starts_at: string | null; qr_tickets_enabled: boolean; offering_types: { kind: "course" | "event"; name: string } | null } | null),
    rows: (regs ?? []) as unknown as ResponseRow[],
    custom,
  };
}

export const OCC: Record<string, string> = { student: "Student", professional: "Professional", both: "Student + professional", other: "Other" };

export function answerText(v: unknown) {
  if (v === null || v === undefined || v === "") return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}
