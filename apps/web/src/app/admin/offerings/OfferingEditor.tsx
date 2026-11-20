"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveOffering, type SaveState } from "./actions";

export type EditorData = {
  id: string | null; kind: "course" | "event"; slug: string; title: string; subtitle: string; summary: string; description: string;
  speaker: string; type_id: string; starts_at: string; ends_at: string; venue: string; location_text: string; capacity: string;
  registration_opens_at: string; registration_closes_at: string; status: string; pinned: boolean; sort_order: string;
  qr_tickets_enabled: boolean; send_confirmation_email: boolean; poster_url: string | null;
  code: string; duration_label: string; duration_months: string; level: string; schedule_text: string; fee_text: string;
  eligibility: string; intake_label: string; outcomes: string; outline: string;
};

export function OfferingEditor({ data, types, venues, saved }: {
  data: EditorData; types: { id: string; name: string }[]; venues: { id: string; name: string }[]; saved?: boolean;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveOffering, saved ? { ok: true, message: "Created. Add the details, then publish when ready." } : {});
  const [venue, setVenue] = useState(data.venue);
  const [posterPreview, setPosterPreview] = useState<string | null>(data.poster_url);
  const err = state.errors ?? {};
  const isCourse = data.kind === "course";
  const live = data.status === "published";

  const E = ({ k }: { k: string }) => (err[k] ? <span className="hk-field__error">{err[k]}</span> : null);

  return (
    <form action={action} className="ad-form">
      <input type="hidden" name="id" value={data.id ?? ""} />
      <input type="hidden" name="kind" value={data.kind} />

      <div className="ad-form__col">
        {state.message && <div className={`ad-alert ${state.ok ? "ad-alert--ok" : "ad-alert--err"}`} role="status">{state.message}</div>}

        <section className="ad-card">
          <h2>Basics</h2>
          <div className="ad-fields">
            <div className="ad-row">
              <label className="ad-label">Type
                <select name="type_id" className="ad-input" defaultValue={data.type_id}>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select><E k="type_id" />
              </label>
              <label className="ad-label">Page link <small>hikmahinstitute.org.pk/{isCourse ? "courses" : "events"}/…</small>
                <input name="slug" className="ad-input" defaultValue={data.slug} placeholder="made from the title if empty" /><E k="slug" />
              </label>
            </div>
            <label className="ad-label">Title<input name="title" className="ad-input" defaultValue={data.title} required /><E k="title" /></label>
            <label className="ad-label">{isCourse ? "Duration shown on cards" : "Series or tagline"} <small>{isCourse ? "e.g. 8 years" : "e.g. Feel Good Fridays"}</small>
              <input name="subtitle" className="ad-input" defaultValue={data.subtitle} />
            </label>
            <label className="ad-label">Short summary <small>shown on cards, 1 or 2 sentences</small>
              <textarea name="summary" className="ad-input" rows={2} defaultValue={data.summary} maxLength={300} />
            </label>
            <label className="ad-label">Description <small>leave an empty line between paragraphs</small>
              <textarea name="description" className="ad-input" rows={8} defaultValue={data.description} />
            </label>
            {!isCourse && <label className="ad-label">Speaker<input name="speaker" className="ad-input" defaultValue={data.speaker} placeholder="e.g. Maulana Khizer Khalid" /></label>}
          </div>
        </section>

        {!isCourse && (
          <section className="ad-card">
            <h2>Date and venue</h2>
            <div className="ad-fields">
              <div className="ad-row">
                <label className="ad-label">Starts <small>Karachi time</small><input type="datetime-local" name="starts_at" className="ad-input" defaultValue={data.starts_at} /><E k="starts_at" /></label>
                <label className="ad-label">Ends<input type="datetime-local" name="ends_at" className="ad-input" defaultValue={data.ends_at} /><E k="ends_at" /></label>
              </div>
              <div className="ad-row">
                <label className="ad-label">Venue
                  <select name="venue" className="ad-input" value={venue} onChange={(e) => setVenue(e.target.value)}>
                    {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    <option value="other">Somewhere else…</option>
                    <option value="online">Online</option>
                  </select>
                </label>
                {venue === "other" && <label className="ad-label">Where<input name="location_text" className="ad-input" defaultValue={data.location_text} placeholder="e.g. Expo Centre, Hall 2" /></label>}
              </div>
            </div>
          </section>
        )}

        {isCourse && (
          <section className="ad-card">
            <h2>Course details</h2>
            <div className="ad-fields">
              <div className="ad-row">
                <label className="ad-label">Course code <small>used in student IDs, e.g. DN</small><input name="code" className="ad-input" defaultValue={data.code} /></label>
                <label className="ad-label">Duration<input name="duration_label" className="ad-input" defaultValue={data.duration_label} placeholder="e.g. 8 years" /></label>
                <label className="ad-label">Months<input name="duration_months" type="number" min={1} className="ad-input" defaultValue={data.duration_months} /></label>
              </div>
              <div className="ad-row">
                <label className="ad-label">Fee<input name="fee_text" className="ad-input" defaultValue={data.fee_text} placeholder="e.g. Free, or Rs 3,000 a month" /></label>
                <label className="ad-label">Next intake<input name="intake_label" className="ad-input" defaultValue={data.intake_label} placeholder="e.g. January 2027" /></label>
                <label className="ad-label">Level<input name="level" className="ad-input" defaultValue={data.level} placeholder="Foundation, Advanced…" /></label>
              </div>
              <label className="ad-label">Who it is for<input name="eligibility" className="ad-input" defaultValue={data.eligibility} placeholder="e.g. Men aged 40 and above" /></label>
              <label className="ad-label">Class times <small>one batch per line, e.g. Weekday: Tue and Wed, 7:00pm to 9:30pm</small>
                <textarea name="schedule_text" className="ad-input" rows={3} defaultValue={data.schedule_text} />
              </label>
              <label className="ad-label">What you will learn <small>one point per line</small>
                <textarea name="outcomes" className="ad-input" rows={5} defaultValue={data.outcomes} />
              </label>
              <label className="ad-label">Course outline <small>one module per line: Title | description</small>
                <textarea name="outline" className="ad-input" rows={8} defaultValue={data.outline} placeholder={"Year 1 | Tafsir I, Hadith I, Fiqh I\nYear 2 | Tafsir II, Hadith II"} />
              </label>
            </div>
          </section>
        )}
      </div>

      <div className="ad-sticky">
        <section className="ad-card">
          <div className="ad-card__head">
            <h2>{data.id ? (live ? "Live on the website" : "Draft") : "New " + data.kind}</h2>
            {data.id && <span className={`ad-pill ad-pill--${data.status}`}>{data.status}</span>}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {live ? (
              <>
                <button name="intent" value="save" className="hk-btn hk-btn--primary hk-btn--block" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
                <button name="intent" value="unpublish" className="hk-btn hk-btn--ghost hk-btn--block" disabled={pending}>Unpublish (back to draft)</button>
              </>
            ) : (
              <>
                <button name="intent" value="publish" className="hk-btn hk-btn--primary hk-btn--block" disabled={pending}>{pending ? "Saving…" : "Publish"}</button>
                <button name="intent" value="draft" className="hk-btn hk-btn--ghost hk-btn--block" disabled={pending}>Save draft</button>
              </>
            )}
            {data.id && <Link href={`/${isCourse ? "courses" : "events"}/${data.slug}`} target="_blank" className="ad-muted" style={{ textAlign: "center" }}>View on website ↗</Link>}
          </div>
        </section>

        <section className="ad-card">
          <h2>Poster</h2>
          <div className="ad-poster">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {posterPreview ? <img src={posterPreview} alt="Poster preview" /> : <div className="ad-poster__empty">No poster yet</div>}
            <input type="file" name="poster" accept="image/jpeg,image/png,image/webp" className="ad-input"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPosterPreview(URL.createObjectURL(f)); }} />
            <E k="poster" />
            <span className="ad-muted">JPG, PNG or WebP up to 8 MB. Landscape (4:3 or 16:9) looks best on cards.</span>
            {data.poster_url && <label className="ad-switch">Remove current poster<input type="checkbox" name="remove_poster" /></label>}
          </div>
        </section>

        <section className="ad-card">
          <h2>Registration</h2>
          <div className="ad-fields">
            {!isCourse && <label className="ad-label">Seats <small>empty means no limit; extra people go on the waitlist</small><input name="capacity" type="number" min={1} className="ad-input" defaultValue={data.capacity} /><E k="capacity" /></label>}
            <div className="ad-row">
              <label className="ad-label">Opens<input type="datetime-local" name="registration_opens_at" className="ad-input" defaultValue={data.registration_opens_at} /></label>
              <label className="ad-label">Closes<input type="datetime-local" name="registration_closes_at" className="ad-input" defaultValue={data.registration_closes_at} /></label>
            </div>
            <label className="ad-switch"><span>Confirmation email<small>Sent when someone registers</small></span><input type="checkbox" name="send_confirmation_email" defaultChecked={data.send_confirmation_email} /></label>
            {!isCourse && <label className="ad-switch"><span>QR tickets and door check-in<small>Only for very crowded events</small></span><input type="checkbox" name="qr_tickets_enabled" defaultChecked={data.qr_tickets_enabled} /></label>}
          </div>
        </section>

        <section className="ad-card">
          <h2>On the website</h2>
          <div className="ad-fields">
            <label className="ad-switch"><span>Pin to the top<small>Shown first on the homepage and listings</small></span><input type="checkbox" name="pinned" defaultChecked={data.pinned} /></label>
            <label className="ad-label">Order <small>lower numbers show first</small><input name="sort_order" type="number" className="ad-input" defaultValue={data.sort_order} /></label>
          </div>
        </section>
      </div>
    </form>
  );
}
