import { NextResponse } from "next/server";
import { icsFile } from "@/lib/calendar";
import { SITE_URL } from "@/lib/env";
import { offeringWhere } from "@/lib/registration";
import { getMyRegistration } from "../data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getMyRegistration(id);
  if (!r?.offerings.starts_at) return new NextResponse("Not found", { status: 404 });
  const o = r.offerings;
  const body = icsFile({
    uid: r.id, title: o.title, start: o.starts_at!, end: o.ends_at, location: offeringWhere(o),
    details: [o.speaker && `Speaker: ${o.speaker}`, r.ticket_code && `Ticket: ${r.ticket_code}`].filter(Boolean).join("\n"),
    url: `${SITE_URL}/account/registrations/${r.id}`,
  });
  return new NextResponse(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${o.slug}.ics"` },
  });
}
