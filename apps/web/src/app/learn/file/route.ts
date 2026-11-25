import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Opens an LMS file after storage rules confirm the signed-in user may read it. */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("p") ?? "";
  const name = req.nextUrl.searchParams.get("n") ?? undefined;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`, req.url));
  if (!/^[cs]\//.test(path)) return new NextResponse("Not found", { status: 404 });
  const download = req.nextUrl.searchParams.get("dl") === "1" ? (name ?? true) : undefined;
  const { data, error } = await supabase.storage.from("lms").createSignedUrl(path, 120, download ? { download } : undefined);
  if (error || !data) return new NextResponse("This file isn't available to you.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
