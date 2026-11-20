import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { Button, ButtonLink, PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { googleCalendarUrl } from "@/lib/calendar";
import { supabaseConfigured } from "@/lib/env";
import { formatEventDate } from "@/lib/offerings";
import { offeringWhere } from "@/lib/registration";
import { cancelRegistration } from "./actions";
import { getMyRegistration } from "./data";

export const metadata: Metadata = { title: "My registration" };

const STATUS = {
  confirmed: { label: "Confirmed", tone: "#1F7A4D", bg: "#E7F4EC" },
  waitlisted: { label: "On the waitlist", tone: "#8A5A00", bg: "#FFF4DC" },
  submitted: { label: "Application submitted", tone: "#1E4F86", bg: "#EAF2FB" },
  cancelled: { label: "Cancelled", tone: "#5A6478", bg: "#EEF1F5" },
  attended: { label: "Attended", tone: "#1F7A4D", bg: "#E7F4EC" },
  no_show: { label: "Missed", tone: "#5A6478", bg: "#EEF1F5" },
} as Record<string, { label: string; tone: string; bg: string }>;

export default async function RegistrationPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }>;
}) {
  if (!supabaseConfigured) redirect("/sign-in");
  const [{ id }, { new: isNew }] = await Promise.all([params, searchParams]);
  const r = await getMyRegistration(id);
  if (!r) notFound();

  const o = r.offerings;
  const isCourse = o.offering_types?.kind === "course";
  const where = offeringWhere(o);
  const when = formatEventDate(o.starts_at);
  const status = STATUS[r.status] ?? STATUS.submitted!;
  const active = ["confirmed", "waitlisted", "submitted"].includes(r.status);
  const showTicket = r.ticket_code && r.status === "confirmed";
  const qrSvg = showTicket ? await QRCode.toString(r.ticket_code!, { type: "svg", margin: 1, width: 240, color: { dark: "#0A1628", light: "#FFFFFF" } }) : null;

  const headline = isNew
    ? r.status === "waitlisted" ? "You're on the waitlist" : isCourse ? "Application received" : "You're registered"
    : o.title;
  const lead = isNew
    ? r.status === "waitlisted" ? "The event is full. If a seat opens you'll move up automatically and we'll email you."
      : isCourse ? "JazakAllah khair. We've emailed you a copy and will be in touch about the next step."
        : `We've emailed your confirmation. See you ${when ? when.split(",")[0] : "soon"}, in sha Allah.`
    : [o.offering_types?.name, o.subtitle].filter(Boolean).join(" · ");

  return (
    <SiteShell>
      <PageBand eyebrow={isNew ? (isCourse ? "Application" : "Registration") : "My registration"} title={headline} lead={lead} />
      <section className="hk-section">
        <div className="hk-container">
          <div className="hk-narrow" style={{ display: "grid", gap: 20 }}>
            <div className="hk-panel" style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: 22 }}>{o.title}</h2>
                  {o.subtitle && <div style={{ color: "var(--hk-muted)" }}>{o.subtitle}</div>}
                </div>
                <span style={{ background: status.bg, color: status.tone, fontWeight: 700, fontSize: 13, padding: "6px 12px", borderRadius: 999 }}>{status.label}</span>
              </div>

              {qrSvg && (
                <div style={{ display: "grid", justifyItems: "center", gap: 8, padding: "8px 0" }}>
                  <div style={{ width: 240, maxWidth: "100%" }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>{r.ticket_code}</div>
                  <div className="hk-field__hint" style={{ textAlign: "center" }}>Show this at the entrance. No phone? Just tell the volunteer your name.</div>
                </div>
              )}

              <dl className="hk-facts" style={{ position: "static" }}>
                <dl style={{ margin: 0, display: "grid", gap: 12 }}>
                  {when && <div><dt>When</dt><dd>{when}</dd></div>}
                  {o.speaker && <div><dt>Speaker</dt><dd>{o.speaker}</dd></div>}
                  {where && <div><dt>{isCourse ? "Campus" : "Where"}</dt><dd>{where}{o.venues?.address && <><br /><span style={{ color: "var(--hk-muted)" }}>{o.venues.address}</span></>}</dd></div>}
                  <div><dt>{isCourse ? "Applied" : "Registered"}</dt><dd>{formatEventDate(r.submitted_at)}</dd></div>
                </dl>
              </dl>

              {active && !isCourse && o.starts_at && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a className="hk-btn hk-btn--ghost hk-btn--sm" href={googleCalendarUrl({ title: o.title, start: o.starts_at, end: o.ends_at, location: where })} target="_blank" rel="noreferrer">Add to Google Calendar</a>
                  <a className="hk-btn hk-btn--ghost hk-btn--sm" href={`/account/registrations/${r.id}/calendar`}>Apple / Outlook (.ics)</a>
                  {o.venues?.map_url && <a className="hk-btn hk-btn--ghost hk-btn--sm" href={o.venues.map_url} target="_blank" rel="noreferrer">Directions</a>}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
              <ButtonLink href="/account" variant="ghost">My registrations</ButtonLink>
              {active && (
                <form action={cancelRegistration}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" variant="ghost" style={{ color: "var(--hk-danger)" }}>{isCourse ? "Withdraw application" : "Cancel my registration"}</Button>
                </form>
              )}
              {r.status === "cancelled" && <Link href={`/register/${o.slug}`}>Register again</Link>}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
