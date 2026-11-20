"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelRegistration(form: FormData) {
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_registration", { p_registration_id: id });
  if (error) console.error("cancel_registration", error.message);
  revalidatePath(`/account/registrations/${id}`);
  revalidatePath("/account");
}
