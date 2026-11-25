"use server";

import { revalidatePath } from "next/cache";
import type { AppRole } from "@hikmah/db";
import { requireAdmin } from "@/lib/admin";

export type StaffState = { ok?: boolean; message?: string };
const ROLES: AppRole[] = ["super_admin", "admin", "faculty", "interviewer", "volunteer"];
const ERR: Record<string, string> = {
  no_account: "There is no account with that email yet. Ask them to sign up on the website first, then add them here.",
  not_allowed: "Only super admins can change who has access.",
  cannot_remove_self: "You cannot remove your own super admin access. Ask another super admin.",
};

export async function setRole(_prev: StaffState, form: FormData): Promise<StaffState> {
  const { supabase } = await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role")) as AppRole;
  const grant = form.get("grant") !== "0";
  if (!/^\S+@\S+\.\S+$/.test(email)) return { message: "Enter a valid email." };
  if (!ROLES.includes(role)) return { message: "Choose a role." };
  const { error } = await supabase.rpc("staff_set_role", { p_email: email, p_role: role, p_grant: grant });
  if (error) return { message: ERR[error.message] ?? `Could not save: ${error.message}` };
  revalidatePath("/admin/admins");
  return { ok: true, message: grant ? `${email} is now ${role === "interviewer" ? "an interviewer" : role === "faculty" ? "a teacher" : role.replace("_", " ")}.` : `Removed ${role === "faculty" ? "teacher" : role.replace("_", " ")} from ${email}.` };
}

export async function removeRole(form: FormData) {
  await setRole({}, form);
}
