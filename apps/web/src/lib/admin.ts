import "server-only";
import { redirect } from "next/navigation";
import type { AppRole } from "@hikmah/db";
import { supabaseConfigured } from "./env";
import { createClient } from "./supabase/server";

export type StaffContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  roles: AppRole[];
  isAdmin: boolean;
};

/** Signed-in user with an admin or volunteer role, or null. */
export async function getStaff(): Promise<StaffContext | null> {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/admin");
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (data ?? []).map((r) => r.role);
  const isAdmin = roles.includes("super_admin") || roles.includes("admin");
  if (!isAdmin && !roles.includes("volunteer")) return null;
  return { supabase, userId: user.id, roles, isAdmin };
}

/** For admin-only pages and actions. The database enforces the same rule through RLS. */
export async function requireAdmin() {
  const staff = await getStaff();
  if (!staff?.isAdmin) redirect("/admin/not-allowed");
  return staff;
}

export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/not-allowed");
  return staff;
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
