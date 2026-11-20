import type { ReactNode } from "react";

/** Small inline icons so the fact card doesn't need an icon library. */
export const Icon = {
  clock: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  pin: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  user: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  check: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>,
};

export type Batch = { label: string; days: string[]; time: string | null };

/** "Weekend batch 1: Sat and Sun, 7:00am to 9:30am" -> { label, days: [Sat, Sun], time } */
export function parseSchedule(text: string | null | undefined): Batch[] {
  if (!text) return [];
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [maybeLabel, rest] = line.includes(":") && !/^\d/.test(line) ? [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1)] : ["Class", line];
    const body = rest ?? line;
    const comma = body.indexOf(",");
    const daysPart = comma >= 0 ? body.slice(0, comma) : body;
    const time = comma >= 0 ? body.slice(comma + 1).trim().replace(/\s+to\s+/i, " – ") : null;
    const days = daysPart.split(/\s*(?:,|and|&)\s*/i).map((d) => d.trim()).filter(Boolean);
    return { label: (maybeLabel ?? "Class").trim(), days, time };
  });
}

export function GlanceStat({ label, value, highlight }: { label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <div className={`hk-glance__stat${highlight ? " hk-glance__stat--hi" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
