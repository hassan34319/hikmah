"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { SiteSettings } from "@/lib/settings";
import { saveHomepage, type HomepageState } from "./actions";

const SECTION_LABELS: [keyof SiteSettings["sections"], string, string][] = [
  ["stats", "Stats band", "The four numbers under the hero"],
  ["partners", "Partner organisations", "Names of companies we've worked with"],
  ["thisWeek", "This week at Hikmah", "Upcoming events carousel"],
  ["flagship", "Flagship course", "The pinned course, e.g. Darse Nizami"],
  ["ribbon", "Scrolling ribbon", "The moving strip of short lines"],
  ["courses", "Course list", "A course for every stage of life"],
  ["community", "Community", "Photo with stats"],
  ["testimonials", "Testimonials", "What our students say"],
  ["talks", "Recent talks", "YouTube videos"],
];

function move<T>(list: T[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

function RowTools({ i, n, onMove, onRemove }: { i: number; n: number; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div className="ad-q__tools">
      <button type="button" className="ad-icon-btn" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Move up">↑</button>
      <button type="button" className="ad-icon-btn" disabled={i === n - 1} onClick={() => onMove(1)} aria-label="Move down">↓</button>
      <button type="button" className="ad-icon-btn ad-icon-btn--danger" onClick={onRemove}>Remove</button>
    </div>
  );
}

export function HomepageEditor({ initial }: { initial: SiteSettings }) {
  const [state, action, pending] = useActionState<HomepageState, FormData>(saveHomepage, {});
  const [v, setV] = useState<SiteSettings>(initial);
  const [preview, setPreview] = useState(initial.hero.image);
  const set = <K extends keyof SiteSettings>(k: K, val: SiteSettings[K]) => setV((cur) => ({ ...cur, [k]: val }));

  return (
    <form action={action} className="ad-form">
      <input type="hidden" name="settings" value={JSON.stringify(v)} />
      <div className="ad-form__col">
        {state.message && <div className={`ad-alert ${state.ok ? "ad-alert--ok" : "ad-alert--err"}`} role="status">{state.message}</div>}

        <section className="ad-card">
          <h2>Hero</h2>
          <div className="ad-fields">
            <label className="ad-label">Small line above the headline<input className="ad-input" value={v.hero.eyebrow} onChange={(e) => set("hero", { ...v.hero, eyebrow: e.target.value })} /></label>
            <div className="ad-row">
              <label className="ad-label">Headline<input className="ad-input" value={v.hero.title} onChange={(e) => set("hero", { ...v.hero, title: e.target.value })} /></label>
              <label className="ad-label">Highlighted ending <small>shown in blue</small><input className="ad-input" value={v.hero.highlight} onChange={(e) => set("hero", { ...v.hero, highlight: e.target.value })} /></label>
            </div>
            <label className="ad-label">Intro text<textarea className="ad-input" rows={3} value={v.hero.lead} onChange={(e) => set("hero", { ...v.hero, lead: e.target.value })} /></label>
            <label className="ad-label">Background photo <small>wide landscape photo, up to 8 MB</small>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12 }} />
              <input type="file" name="hero_image" accept="image/jpeg,image/png,image/webp" className="ad-input"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
            </label>
          </div>
        </section>

        <section className="ad-card">
          <h2>Stats</h2>
          <div className="ad-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            {[0, 1, 2, 3].map((i) => {
              const s = v.stats[i] ?? { value: "", label: "" };
              const update = (patch: Partial<typeof s>) => { const next = [...v.stats]; next[i] = { ...s, ...patch }; set("stats", next); };
              return (
                <div key={i} className="ad-fields" style={{ gap: 6 }}>
                  <input className="ad-input" placeholder="350" value={s.value} onChange={(e) => update({ value: e.target.value })} aria-label={`Stat ${i + 1} number`} style={{ fontWeight: 700 }} />
                  <input className="ad-input" placeholder="students in long courses" value={s.label} onChange={(e) => update({ label: e.target.value })} aria-label={`Stat ${i + 1} label`} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="ad-card">
          <div className="ad-card__head"><h2>Testimonials</h2><button type="button" className="hk-btn hk-btn--ghost hk-btn--sm" onClick={() => set("testimonials", [...v.testimonials, { quote: "", name: "", role: "" }])}>+ Add</button></div>
          <div style={{ display: "grid", gap: 10 }}>
            {v.testimonials.map((t, i) => {
              const update = (patch: Partial<typeof t>) => set("testimonials", v.testimonials.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="ad-q" style={{ gridTemplateColumns: "1fr auto", alignItems: "start" }}>
                  <div className="ad-fields" style={{ gap: 8 }}>
                    <textarea className="ad-input" rows={2} placeholder="What they said" value={t.quote} onChange={(e) => update({ quote: e.target.value })} />
                    <div className="ad-row">
                      <input className="ad-input" placeholder="Name" value={t.name} onChange={(e) => update({ name: e.target.value })} />
                      <input className="ad-input" placeholder="e.g. 4th Year, Darse Nizami" value={t.role} onChange={(e) => update({ role: e.target.value })} />
                    </div>
                  </div>
                  <RowTools i={i} n={v.testimonials.length} onMove={(d) => set("testimonials", move(v.testimonials, i, d))} onRemove={() => set("testimonials", v.testimonials.filter((_, j) => j !== i))} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="ad-card">
          <div className="ad-card__head"><h2>Recent talks <small className="ad-muted" style={{ fontWeight: 400 }}>up to 6</small></h2>{v.talks.length < 6 && <button type="button" className="hk-btn hk-btn--ghost hk-btn--sm" onClick={() => set("talks", [...v.talks, { id: "", series: "", title: "", speaker: "" }])}>+ Add</button>}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {v.talks.map((t, i) => {
              const update = (patch: Partial<typeof t>) => set("talks", v.talks.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="ad-q" style={{ gridTemplateColumns: "1fr auto", alignItems: "start" }}>
                  <div className="ad-fields" style={{ gap: 8 }}>
                    <input className="ad-input" placeholder="YouTube link" value={t.id.length === 11 ? `https://www.youtube.com/watch?v=${t.id}` : t.id} onChange={(e) => update({ id: e.target.value })} />
                    <div className="ad-row">
                      <input className="ad-input" placeholder="Title" value={t.title} onChange={(e) => update({ title: e.target.value })} />
                      <input className="ad-input" placeholder="Series, e.g. Feel Good Fridays" value={t.series} onChange={(e) => update({ series: e.target.value })} />
                      <input className="ad-input" placeholder="Speaker" value={t.speaker} onChange={(e) => update({ speaker: e.target.value })} />
                    </div>
                  </div>
                  <RowTools i={i} n={v.talks.length} onMove={(d) => set("talks", move(v.talks, i, d))} onRemove={() => set("talks", v.talks.filter((_, j) => j !== i))} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="ad-card">
          <h2>Lists</h2>
          <div className="ad-row">
            <label className="ad-label">Scrolling ribbon <small>one line each</small>
              <textarea className="ad-input" rows={7} value={v.ribbon.join("\n")} onChange={(e) => set("ribbon", e.target.value.split("\n"))} />
            </label>
            <label className="ad-label">Partner organisations <small>one per line; also shown on Hikmah at Work</small>
              <textarea className="ad-input" rows={7} value={v.partners.join("\n")} onChange={(e) => set("partners", e.target.value.split("\n"))} />
            </label>
          </div>
        </section>

        <section className="ad-card">
          <h2>Contact and social links <small className="ad-muted" style={{ fontWeight: 400 }}>shown in the footer on every page</small></h2>
          <div className="ad-fields">
            <div className="ad-row">
              <label className="ad-label">Phone<input className="ad-input" value={v.contact.phone} onChange={(e) => set("contact", { ...v.contact, phone: e.target.value })} /></label>
              <label className="ad-label">Email<input className="ad-input" value={v.contact.email} onChange={(e) => set("contact", { ...v.contact, email: e.target.value })} /></label>
            </div>
            <label className="ad-label">WhatsApp link <small>e.g. https://wa.me/923330382121</small><input className="ad-input" value={v.contact.whatsapp} onChange={(e) => set("contact", { ...v.contact, whatsapp: e.target.value })} /></label>
            <div className="ad-row">
              <label className="ad-label">YouTube<input className="ad-input" value={v.contact.youtube} onChange={(e) => set("contact", { ...v.contact, youtube: e.target.value })} /></label>
              <label className="ad-label">Instagram<input className="ad-input" value={v.contact.instagram} onChange={(e) => set("contact", { ...v.contact, instagram: e.target.value })} /></label>
              <label className="ad-label">LinkedIn<input className="ad-input" value={v.contact.linkedin} onChange={(e) => set("contact", { ...v.contact, linkedin: e.target.value })} /></label>
            </div>
          </div>
        </section>
      </div>

      <div className="ad-sticky">
        <section className="ad-card">
          <h2>Publish</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <button className="hk-btn hk-btn--primary hk-btn--block" disabled={pending}>{pending ? "Saving…" : "Save and publish"}</button>
            <Link href="/" target="_blank" className="ad-muted" style={{ textAlign: "center" }}>View homepage ↗</Link>
          </div>
        </section>
        <section className="ad-card">
          <h2>Sections</h2>
          <p className="ad-muted" style={{ marginTop: -6 }}>Switch parts of the homepage on or off. Pin a course or event from its own editor to feature it.</p>
          {SECTION_LABELS.map(([k, label, hint]) => (
            <label key={k} className="ad-switch"><span>{label}<small>{hint}</small></span>
              <input type="checkbox" checked={v.sections[k]} onChange={(e) => set("sections", { ...v.sections, [k]: e.target.checked })} />
            </label>
          ))}
        </section>
      </div>
    </form>
  );
}
