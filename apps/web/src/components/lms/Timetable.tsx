import { WEEKDAYS, WEEK_ORDER, fmtTime } from "@/lib/lms";

export type Period = { id: string; weekday: number; starts: string; ends: string; title: string; detail?: string };

/** Week view: one column per day that has classes; today is highlighted. */
export function Timetable({ periods }: { periods: Period[] }) {
  const today = new Date(Date.now() + 5 * 3600_000).getUTCDay();
  const days = WEEK_ORDER.filter((d) => periods.some((p) => p.weekday === d));
  return (
    <div className="lm-week">
      {days.map((d) => (
        <section key={d} className={`lm-week__day${d === today ? " is-today" : ""}`}>
          <h3>{WEEKDAYS[d]}{d === today && <span>Today</span>}</h3>
          {periods.filter((p) => p.weekday === d).sort((a, b) => a.starts.localeCompare(b.starts)).map((p) => (
            <div key={p.id} className="lm-period">
              <span className="lm-period__time">{fmtTime(p.starts)} to {fmtTime(p.ends)}</span>
              <strong>{p.title}</strong>
              {p.detail && <span className="ad-muted">{p.detail}</span>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
