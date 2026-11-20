"use server";

import { revalidatePath } from "next/cache";
import type { RegistrationStatus } from "@hikmah/db";
import { requireAdmin } from "@/lib/admin";

const ALLOWED: RegistrationStatus[] = ["submitted", "confirmed", "waitlisted", "cancelled", "attended", "no_show"];

export async function bulkStatus(form: FormData) {
  const { supabase, userId } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  const status = String(form.get("status")) as RegistrationStatus;
  const ids = form.getAll("ids").map(String).filter(Boolean);
  if (!ALLOWED.includes(status) || ids.length === 0) return;
  const patch: { status: RegistrationStatus; checked_in_at?: string; checked_in_by?: string } = { status };
  if (status === "attended") { patch.checked_in_at = new Date().toISOString(); patch.checked_in_by = userId; }
  await supabase.from("registrations").update(patch).in("id", ids).eq("offering_id", offeringId);
  revalidatePath(`/admin/offerings/${offeringId}/responses`);
}

export async function saveNote(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id"));
  const offeringId = String(form.get("offering_id"));
  await supabase.from("registrations").update({ admin_notes: String(form.get("admin_notes") ?? "").slice(0, 2000) || null }).eq("id", id);
  revalidatePath(`/admin/offerings/${offeringId}/responses`);
}
