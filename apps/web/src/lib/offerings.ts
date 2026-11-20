import type { OfferingKind, OfferingRow } from "@hikmah/db";
import { supabaseConfigured } from "./env";
import { createClient } from "./supabase/server";

export type OfferingWithType = OfferingRow & {
  offering_types: { slug: string; name: string; kind: OfferingKind } | null;
};

const SELECT = "*, offering_types!inner(slug, name, kind)";

/** Published offerings of one kind. Pinned first, then admin order, then newest. */
export async function listOfferings(kind: OfferingKind, limit?: number): Promise<OfferingWithType[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  let query = supabase
    .from("offerings")
    .select(SELECT)
    .eq("status", "published")
    .eq("offering_types.kind", kind)
    .order("pinned", { ascending: false })
    .order("sort_order", { ascending: true });
  query = kind === "event"
    ? query.order("starts_at", { ascending: true, nullsFirst: false })
    : query.order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.error("listOfferings", error.message);
    return [];
  }
  return (data ?? []) as unknown as OfferingWithType[];
}

export async function getOffering(slug: string) {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("offerings")
    .select(`${SELECT}, course_details(*), course_modules(position, title, description), venues(name, area, city)`)
    .eq("slug", slug)
    .maybeSingle();
  return data as unknown as (OfferingWithType & {
    course_details: { duration_label: string | null; schedule_text: string | null; fee_text: string | null; intake_label: string | null } | null;
    course_modules: { position: number; title: string; description: string | null }[];
    venues: { name: string; area: string | null; city: string } | null;
  }) | null;
}

export function formatEventDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-PK", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi",
  }).format(new Date(iso));
}
