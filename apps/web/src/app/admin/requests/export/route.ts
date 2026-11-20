import { NextResponse, type NextRequest } from "next/server";
import type { RequestKind, RequestRow } from "@hikmah/db";
import { getStaff } from "@/lib/admin";
import { fmtDate } from "@/lib/time";
import { requestSections } from "../view";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return `"${(/^[=@]|^[+-](?!\d)/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  const staff = await getStaff();
  if (!staff?.isAdmin) return new NextResponse("Not allowed", { status: 403 });
  const kind = (req.nextUrl.searchParams.get("kind") ?? "hifz") as RequestKind;
  const { data } = await staff.supabase.from("requests").select("*").eq("kind", kind).order("created_at", { ascending: true });
  const rows = (data ?? []) as RequestRow[];

  // Flatten every section into columns; Hifz gets one row per child so it sorts nicely in Excel.
  const lines: Record<string, string>[] = [];
  for (const r of rows) {
    const base = { Received: fmtDate(r.created_at, { dateStyle: "medium", timeStyle: "short" }), Status: r.status, Name: r.name, Email: r.email ?? "", Phone: r.phone ?? "", "Admin note": r.admin_notes ?? "" };
    const sections = requestSections(r.kind, r.payload as Record<string, unknown>);
    const shared: Record<string, string> = {};
    const children: Record<string, string>[] = [];
    for (const s of sections) {
      if (s.title?.startsWith("Child")) children.push(Object.fromEntries([["Child", s.title.replace(/^Child \d+: /, "")], ...s.rows.map(([k, v]) => [`Child ${k.toLowerCase()}`, v])]));
      else for (const [k, v] of s.rows) { const t = s.title?.split(" /")[0]; shared[t && t !== k ? `${t} ${k.toLowerCase()}` : k] = v; }
    }
    if (children.length) children.forEach((c) => lines.push({ ...base, ...c, ...shared }));
    else lines.push({ ...base, ...shared });
  }
  const header = [...new Set(lines.flatMap((l) => Object.keys(l)))];
  const body = "﻿" + [header.map(cell).join(","), ...lines.map((l) => header.map((h) => cell(l[h])).join(","))].join("\r\n");
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-requests-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
