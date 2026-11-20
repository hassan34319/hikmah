import { NextResponse, type NextRequest } from "next/server";
import type { PersonResult } from "@hikmah/db";
import { getStaff } from "@/lib/admin";
import { asJson, rulesFromParams } from "@/lib/people";
import { fmtDate } from "@/lib/time";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return `"${(/^[=@]|^[+-](?!\d)/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  const staff = await getStaff();
  if (!staff?.isAdmin) return new NextResponse("Not allowed", { status: 403 });
  const rules = rulesFromParams(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const { data, error } = await staff.supabase.rpc("people_search", { p_rules: asJson(rules) });
  if (error) return new NextResponse(error.message, { status: 500 });
  const rows = (data ?? []) as PersonResult[];
  const header = ["Name", "Email", "WhatsApp", "Area", "Occupation", "Gender", "Interests", "Registrations", "Last registered", "Email opt in", "WhatsApp opt in", "Joined"];
  const lines = rows.map((p) => [
    p.full_name, p.email, p.phone, p.area, p.occupation_type, p.gender, (p.interests ?? []).join("; "), p.registrations,
    p.last_registered_at ? fmtDate(p.last_registered_at, { dateStyle: "medium" }) : "", p.email_opt_in ? "yes" : "no", p.whatsapp_opt_in ? "yes" : "no",
    fmtDate(p.joined_at, { dateStyle: "medium" }),
  ].map(cell).join(","));
  const body = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="people-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
