"use server";

import { revalidatePath } from "next/cache";
import type { FieldType } from "@hikmah/db";
import { requireAdmin, slugify } from "@/lib/admin";

export type FieldState = { ok?: boolean; message?: string };

const TYPES: FieldType[] = ["short_text", "long_text", "email", "phone", "number", "date", "single_select", "multi_select", "checkbox", "url"];

/** Creates a reusable question. When attach_to is set, also adds it to that offering's form. */
export async function createField(_prev: FieldState, form: FormData): Promise<FieldState> {
  const { supabase, userId } = await requireAdmin();
  const label = String(form.get("label") ?? "").trim();
  const type = String(form.get("type") ?? "") as FieldType;
  const options = String(form.get("options") ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const help = String(form.get("help_text") ?? "").trim() || null;
  const attachTo = String(form.get("attach_to") ?? "") || null;
  const required = form.get("required") === "on";

  if (label.length < 3) return { message: "Write the question." };
  if (!TYPES.includes(type)) return { message: "Choose an answer type." };
  if ((type === "single_select" || type === "multi_select") && options.length < 2) return { message: "Add at least 2 choices, one per line." };

  let key = slugify(label).replace(/-/g, "_").slice(0, 40).replace(/^[^a-z]+/, "") || "question";
  const { data: clash } = await supabase.from("fields").select("key").like("key", `${key}%`);
  if (clash?.some((c) => c.key === key)) key = `${key}_${(clash?.length ?? 0) + 1}`;

  const { data: field, error } = await supabase.from("fields")
    .insert({ key, label, type, options: type.endsWith("select") ? options : [], help_text: help, created_by: userId })
    .select("id").single();
  if (error || !field) return { message: `Could not save: ${error?.message}` };

  if (attachTo) {
    const { data: last } = await supabase.from("form_fields").select("position").eq("offering_id", attachTo).order("position", { ascending: false }).limit(1);
    await supabase.from("form_fields").insert({ offering_id: attachTo, field_id: field.id, position: (last?.[0]?.position ?? 0) + 1, required });
    revalidatePath(`/admin/offerings/${attachTo}/form`);
  }
  revalidatePath("/admin/fields");
  return { ok: true, message: "Question added." };
}
