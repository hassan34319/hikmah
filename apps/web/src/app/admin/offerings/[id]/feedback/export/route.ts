import { NextResponse } from "next/server";
import { getStaff } from "@/lib/admin";
import { DEFAULT_FEEDBACK, parseQuestions } from "@/lib/feedback";
import { fmtDate } from "@/lib/time";

const cell = (v: unknown) => { const s = Array.isArray(v) ? v.join("; ") : String(v ?? ""); return `"${(/^[=@]|^[+-](?!\d)/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`; };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff?.isAdmin) return new NextResponse("Not allowed", { status: 403 });
  const { id } = await params;
  const [{ data: o }, { data: f }, { data: rs }] = await Promise.all([
    staff.supabase.from("offerings").select("slug").eq("id", id).maybeSingle(),
    staff.supabase.from("feedback_forms").select("questions").eq("offering_id", id).maybeSingle(),
    staff.supabase.from("feedback_responses").select("answers, anonymous, created_at, registrations(profiles(full_name, email))").eq("offering_id", id).order("created_at"),
  ]);
  const qs = f ? parseQuestions(f.questions) : DEFAULT_FEEDBACK;
  type R = { answers: Record<string, unknown>; anonymous: boolean; created_at: string; registrations: { profiles: { full_name: string | null; email: string } | null } | null };
  const rows = ((rs ?? []) as unknown as R[]).map((r) => [
    fmtDate(r.created_at, { dateStyle: "medium", timeStyle: "short" }),
    r.anonymous ? "Anonymous" : r.registrations?.profiles?.full_name ?? "",
    r.anonymous ? "" : r.registrations?.profiles?.email ?? "",
    ...qs.map((q) => r.answers[q.key]),
  ].map(cell).join(","));
  const body = "﻿" + [["Submitted", "Name", "Email", ...qs.map((q) => q.label)].map(cell).join(","), ...rows].join("\r\n");
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${o?.slug ?? "event"}-feedback.csv"`, "Cache-Control": "no-store" } });
}
