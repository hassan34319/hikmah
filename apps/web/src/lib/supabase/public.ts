import { createClient } from "@supabase/supabase-js";
import type { Database } from "@hikmah/db";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";

/** Cookie-free client for public data, so pages that only show public content can stay cached. */
export function publicClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
