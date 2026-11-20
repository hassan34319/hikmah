import { NextResponse } from "next/server";
import { getStaff } from "@/lib/admin";
import { fmtDate } from "@/lib/time";
import { OCC, answerText, loadResponses } from "../data";

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  // Prevent spreadsheet formula injection, then quote.
  const safe = /^[=@]|^[+-](?!\d)/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff?.isAdmin) return new NextResponse("Not allowed", { status: 403 });
  const { id } = await params;
  const { offering, rows, custom } = await loadResponses(staff.supabase, id);
  if (!offering) return new NextResponse("Not found", { status: 404 });

  const header = ["Name", "Email", "WhatsApp", "Gender", "CNIC", "Date of birth", "Occupation", "Job title", "Company", "University", "Degree", "Year", "Area", "Address", "Interests", "Heard from", "Status", "Registered at", "Checked in at", "Ticket", "Admin note", ...custom.map((c) => c.label)];
  const lines = rows.map((r) => {
    const p = r.profiles;
    return [
      p?.full_name, p?.email, p?.phone, p?.gender, p?.cnic, p?.date_of_birth, OCC[p?.occupation_type ?? ""] ?? "", p?.job_title, p?.company,
      p?.university, p?.degree, p?.education_year, p?.area, p?.address_line, (p?.interests ?? []).join("; "), p?.heard_from,
      r.status, fmtDate(r.submitted_at, { dateStyle: "medium", timeStyle: "short" }), r.checked_in_at ? fmtDate(r.checked_in_at, { dateStyle: "medium", timeStyle: "short" }) : "",
      r.ticket_code, r.admin_notes, ...custom.map((c) => answerText(r.answers?.[c.key])),
    ].map(csvCell).join(",");
  });
  const body = "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  const name = `${offering.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}
