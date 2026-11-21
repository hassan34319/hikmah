"use client";

import { useActionState, useState } from "react";
import { bookSlot, type BookState } from "./actions";

type Slot = { slot_id: string; day: string; time: string; venue: string | null; seats_left: number; mine: boolean };

export function BookForm({ token, slots }: { token: string; slots: Slot[] }) {
  const [s, act, pending] = useActionState<BookState, FormData>(bookSlot, {});
  const [pick, setPick] = useState(slots.find((x) => x.mine)?.slot_id ?? "");
  const days = [...new Set(slots.map((x) => x.day))];
  return (
    <form action={act} className="ad-fields">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="slot" value={pick} />
      {s.message && <div className={`hk-alert ${s.ok ? "hk-alert--success" : "hk-alert--error"}`} role="status">{s.message}</div>}
      {days.map((d) => (
        <div key={d} className="adm-day">
          <strong>{d}</strong>
          <div className="adm-slots">
            {slots.filter((x) => x.day === d).map((x) => (
              <button type="button" key={x.slot_id} disabled={x.seats_left <= 0 && !x.mine} aria-pressed={pick === x.slot_id} onClick={() => setPick(x.slot_id)}>
                {x.time}{x.venue ? <small>{x.venue}</small> : null}
              </button>
            ))}
          </div>
        </div>
      ))}
      {!slots.length && <p className="hk-field__hint">No times are open right now. We’ll email you when more are added.</p>}
      {slots.length > 0 && <button className="hk-btn hk-btn--primary" disabled={pending || !pick}>{pending ? "Booking…" : slots.some((x) => x.mine) ? "Change my time" : "Book this time"}</button>}
    </form>
  );
}
