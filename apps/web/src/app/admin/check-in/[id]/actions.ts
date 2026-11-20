"use server";

import { requireStaff } from "@/lib/admin";

export type Found = { registration_id: string; full_name: string | null; phone: string | null; status: string; ticket_code: string | null; checked_in_at: string | null };

export async function lookup(offeringId: string, query: string): Promise<{ results: Found[]; error?: string }> {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("checkin_lookup", { p_offering_id: offeringId, p_query: query.slice(0, 80) });
  if (error) return { results: [], error: "Could not search. Check your connection." };
  return { results: (data ?? []) as Found[] };
}

export async function markArrived(offeringId: string, registrationId: string) {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("checkin_mark", { p_registration_id: registrationId });
  if (error || !data?.[0]) return { ok: false as const, message: "Could not check in. Try again." };
  const counts = await supabase.rpc("checkin_counts", { p_offering_id: offeringId });
  return { ok: true as const, name: data[0].full_name, already: data[0].already, waitlisted: false, counts: counts.data?.[0] ?? null };
}
