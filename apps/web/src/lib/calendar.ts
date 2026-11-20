/** Google Calendar "add event" link. Times are UTC in the basic format Google expects. */
export function googleCalendarUrl(e: { title: string; start: string; end?: string | null; details?: string; location?: string | null }) {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = e.end ?? new Date(new Date(e.start).getTime() + 2 * 3600_000).toISOString();
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${fmt(e.start)}/${fmt(end)}` });
  if (e.details) q.set("details", e.details);
  if (e.location) q.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** A minimal .ics file for Apple Calendar and Outlook. */
export function icsFile(e: { uid: string; title: string; start: string; end?: string | null; details?: string; location?: string | null; url?: string }) {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
  const end = e.end ?? new Date(new Date(e.start).getTime() + 2 * 3600_000).toISOString();
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hikmah Institute//Events//EN", "BEGIN:VEVENT",
    `UID:${e.uid}@hikmahinstitute.org.pk`, `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(e.start)}`, `DTEND:${fmt(end)}`, `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "", e.details ? `DESCRIPTION:${esc(e.details)}` : "",
    e.url ? `URL:${e.url}` : "", "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
