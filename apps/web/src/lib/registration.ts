import "server-only";
import { renderRegistrationEmail } from "@hikmah/emails";
import type { RegistrationRow } from "@hikmah/db";
import { googleCalendarUrl } from "./calendar";
import { emailLogoUrl, sendEmail } from "./email";
import { SITE_URL } from "./env";
import { formatEventDate } from "./offerings";

type OfferingForEmail = {
  title: string; subtitle: string | null; speaker: string | null; starts_at: string | null; ends_at: string | null;
  is_online: boolean; location_text: string | null; qr_tickets_enabled: boolean; slug: string;
  offering_types: { kind: "course" | "event" } | null;
  venues: { name: string; address: string | null; map_url: string | null } | null;
};

export function offeringWhere(o: Pick<OfferingForEmail, "is_online" | "location_text" | "venues">) {
  if (o.is_online) return "Online";
  return o.venues ? `${o.venues.name}, Karachi` : o.location_text;
}

export async function sendRegistrationEmail(args: {
  to: string; fullName: string | null; offering: OfferingForEmail; registration: RegistrationRow;
}) {
  const { offering: o, registration: r } = args;
  if (r.status !== "confirmed" && r.status !== "waitlisted" && r.status !== "submitted") return;
  const kind = o.offering_types?.kind ?? "event";
  const regUrl = `${SITE_URL}/account/registrations/${r.id}`;
  const where = offeringWhere(o);

  const email = await renderRegistrationEmail({
    firstName: args.fullName?.split(" ")[0] || "there",
    kind,
    status: r.status,
    title: o.title,
    subtitle: o.subtitle,
    when: formatEventDate(o.starts_at),
    where,
    address: o.venues?.address,
    mapUrl: o.venues?.map_url,
    speaker: o.speaker,
    ticketCode: r.ticket_code,
    ticketUrl: r.ticket_code ? regUrl : null,
    calendarUrl: o.starts_at ? googleCalendarUrl({ title: o.title, start: o.starts_at, end: o.ends_at, location: where, details: regUrl }) : null,
    accountUrl: regUrl,
    logoUrl: emailLogoUrl,
  });
  await sendEmail({ to: args.to, ...email });
}
