import { supabaseConfigured } from "./env";
import { createClient } from "./supabase/server";

export async function getCurrentUser() {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
