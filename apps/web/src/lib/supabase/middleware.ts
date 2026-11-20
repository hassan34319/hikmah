import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@hikmah/db";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "../env";

/** Paths a signed-in user with an unfinished profile may still visit. */
const PROFILE_EXEMPT = ["/complete-profile", "/sign-in", "/auth"];
/** Paths that need a signed-in user. */
const SIGNED_IN_ONLY = ["/account", "/complete-profile"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured) return response;

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const startsWith = (list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));

  const redirect = (to: string, keepNext = true) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = keepNext ? `?next=${encodeURIComponent(path + request.nextUrl.search)}` : "";
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user) {
    return startsWith(SIGNED_IN_ONLY) ? redirect("/sign-in") : response;
  }

  // Signed in: send people to finish their profile once before anything else.
  if (!startsWith(PROFILE_EXEMPT)) {
    const { data: profile } = await supabase
      .from("profiles").select("profile_completed_at").eq("id", user.id).maybeSingle();
    if (!profile?.profile_completed_at) return redirect("/complete-profile");
  }

  return response;
}
