import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the sign-in link in Supabase's default email (used until custom SMTP lets us
 * send a code-only email). Exchanges the one-time code for a session, then continues.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const back = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (!code) return back("/sign-in?error=link");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back("/sign-in?error=link");

  const { data: profile } = await supabase
    .from("profiles").select("profile_completed_at").eq("id", data.user.id).maybeSingle();
  return back(profile?.profile_completed_at ? next : `/complete-profile?next=${encodeURIComponent(next)}`);
}
