"use server";

import { revalidatePath } from "next/cache";
import type { RequestStatus } from "@hikmah/db";
import { requireAdmin } from "@/lib/admin";

const STATUSES: RequestStatus[] = ["new", "in_progress", "done", "archived"];

export async function updateRequest(form: FormData) {
  const { supabase, userId } = await requireAdmin();
  const id = String(form.get("id"));
  const status = String(form.get("status") ?? "") as RequestStatus;
  const patch: { status?: RequestStatus; admin_notes?: string | null; handled_by?: string } = { handled_by: userId };
  if (STATUSES.includes(status)) patch.status = status;
  if (form.has("admin_notes")) patch.admin_notes = String(form.get("admin_notes") ?? "").slice(0, 2000) || null;
  await supabase.from("requests").update(patch).eq("id", id);
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}
