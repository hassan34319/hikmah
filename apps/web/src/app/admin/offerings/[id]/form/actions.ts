"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

async function reorder(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], offeringId: string, ids: string[]) {
  // Positions are unique per offering in practice but not constrained, so plain sequential updates are safe.
  await Promise.all(ids.map((id, i) => supabase.from("form_fields").update({ position: i + 1 }).eq("id", id).eq("offering_id", offeringId)));
}

export async function formFieldAction(form: FormData) {
  const { supabase } = await requireAdmin();
  const offeringId = String(form.get("offering_id"));
  const op = String(form.get("op"));
  const id = String(form.get("id") ?? "");

  const { data: rows } = await supabase.from("form_fields").select("id, position, required").eq("offering_id", offeringId).order("position");
  const list = rows ?? [];
  const idx = list.findIndex((r) => r.id === id);

  if (op === "add") {
    const fieldId = String(form.get("field_id") ?? "");
    if (fieldId) await supabase.from("form_fields").insert({ offering_id: offeringId, field_id: fieldId, position: list.length + 1, required: form.get("required") === "on" });
  } else if (op === "remove" && idx >= 0) {
    await supabase.from("form_fields").delete().eq("id", id);
    await reorder(supabase, offeringId, list.filter((r) => r.id !== id).map((r) => r.id));
  } else if (op === "required" && idx >= 0) {
    await supabase.from("form_fields").update({ required: !list[idx]!.required }).eq("id", id);
  } else if ((op === "up" || op === "down") && idx >= 0) {
    const j = op === "up" ? idx - 1 : idx + 1;
    if (j >= 0 && j < list.length) {
      const ids = list.map((r) => r.id);
      [ids[idx], ids[j]] = [ids[j]!, ids[idx]!];
      await reorder(supabase, offeringId, ids);
    }
  }
  revalidatePath(`/admin/offerings/${offeringId}/form`);
}
