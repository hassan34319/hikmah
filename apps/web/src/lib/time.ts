/** All admin dates are entered and shown in Karachi time (UTC+5, no daylight saving). */
const TZ = "Asia/Karachi";

/** ISO timestamp -> value for <input type="datetime-local"> in Karachi time. */
export function toPktInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return d.toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value (Karachi time) -> ISO timestamp, or null when empty. */
export function fromPktInput(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  return new Date(`${s}:00+05:00`).toISOString();
}

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-PK", { ...opts, timeZone: TZ }).format(new Date(iso));
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}
