export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** Supabase's recommended publishable key. The legacy anon key name still works as a fallback. */
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** False until .env.local is filled in. Pages show a notice instead of crashing. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
