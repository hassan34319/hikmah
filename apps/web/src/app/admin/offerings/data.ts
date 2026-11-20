import "server-only";
import type { StaffContext } from "@/lib/admin";
import { toPktInput } from "@/lib/time";
import type { EditorData } from "./OfferingEditor";

export async function editorOptions(supabase: StaffContext["supabase"], kind: "course" | "event") {
  const [{ data: types }, { data: venues }] = await Promise.all([
    supabase.from("offering_types").select("id, name, kind").eq("kind", kind).order("sort_order"),
    supabase.from("venues").select("id, name").order("name", { ascending: false }),
  ]);
  return { types: types ?? [], venues: venues ?? [] };
}

export function blankEditor(kind: "course" | "event", typeId: string, venueId: string): EditorData {
  return {
    id: null, kind, slug: "", title: "", subtitle: "", summary: "", description: "", speaker: "", type_id: typeId,
    starts_at: "", ends_at: "", venue: venueId, location_text: "", capacity: "", registration_opens_at: "", registration_closes_at: "",
    status: "draft", pinned: false, sort_order: "0", qr_tickets_enabled: false, send_confirmation_email: true, poster_url: null,
    code: "", duration_label: "", duration_months: "", level: "", schedule_text: "", fee_text: "", eligibility: "", intake_label: "", outcomes: "", outline: "",
  };
}

export async function loadEditor(supabase: StaffContext["supabase"], id: string) {
  const { data } = await supabase.from("offerings")
    .select("*, offering_types(kind, name), course_details(*), course_modules(position, title, description)")
    .eq("id", id).maybeSingle();
  if (!data) return null;
  type Row = typeof data & {
    offering_types: { kind: "course" | "event"; name: string } | null;
    course_details: { code: string | null; duration_label: string | null; duration_months: number | null; level: string | null; schedule_text: string | null; fee_text: string | null; eligibility: string | null; intake_label: string | null; outcomes: string[] } | null;
    course_modules: { position: number; title: string; description: string | null }[];
  };
  const o = data as unknown as Row;
  const cd = o.course_details;
  const editor: EditorData = {
    id: o.id, kind: o.offering_types?.kind ?? "event", slug: o.slug, title: o.title, subtitle: o.subtitle ?? "", summary: o.summary ?? "",
    description: o.description ?? "", speaker: o.speaker ?? "", type_id: o.type_id, starts_at: toPktInput(o.starts_at), ends_at: toPktInput(o.ends_at),
    venue: o.is_online ? "online" : o.venue_id ?? (o.location_text ? "other" : ""), location_text: o.location_text ?? "",
    capacity: o.capacity ? String(o.capacity) : "", registration_opens_at: toPktInput(o.registration_opens_at),
    registration_closes_at: toPktInput(o.registration_closes_at), status: o.status, pinned: o.pinned, sort_order: String(o.sort_order),
    qr_tickets_enabled: o.qr_tickets_enabled, send_confirmation_email: o.send_confirmation_email, poster_url: o.poster_url,
    code: cd?.code ?? "", duration_label: cd?.duration_label ?? "", duration_months: cd?.duration_months ? String(cd.duration_months) : "",
    level: cd?.level ?? "", schedule_text: cd?.schedule_text ?? "", fee_text: cd?.fee_text ?? "", eligibility: cd?.eligibility ?? "",
    intake_label: cd?.intake_label ?? "", outcomes: (cd?.outcomes ?? []).join("\n"),
    outline: [...(o.course_modules ?? [])].sort((a, b) => a.position - b.position).map((m) => (m.description ? `${m.title} | ${m.description}` : m.title)).join("\n"),
  };
  return editor;
}
