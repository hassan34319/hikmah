import { notFound } from "next/navigation";
import { ButtonLink, PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { GlanceStat, Icon, parseSchedule } from "@/components/Glance";
import { getOffering } from "@/lib/offerings";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const TZ = "Asia/Karachi";
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-PK", { ...o, timeZone: TZ }).format(new Date(iso));
const month = (iso: string) => fmt(iso, { month: "short" }).toUpperCase();
const dayNum = (iso: string) => fmt(iso, { day: "numeric" });
const weekday = (iso: string) => fmt(iso, { weekday: "long" });
const timeRange = (a: string, b: string | null) => b ? `${fmt(a, { hour: "numeric", minute: "2-digit" })} – ${fmt(b, { hour: "numeric", minute: "2-digit" })}` : fmt(a, { hour: "numeric", minute: "2-digit" });
const initials = (name: string) => name.replace(/^(Dr|Mufti|Maulana|Shaykh)\.?\s+/gi, "").replace(/^(Dr)\.?\s+/i, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export async function OfferingDetail({ slug, section }: { slug: string; section: "courses" | "events" }) {
  const o = await getOffering(slug);
  const kind = section === "courses" ? "course" : "event";
  if (!o || o.offering_types?.kind !== kind) notFound();

  const isCourse = kind === "course";
  const cd = o.course_details;
  const modules = [...(o.course_modules ?? [])].sort((a, b) => a.position - b.position);
  const open = o.status === "published";
  const ctaLabel = isCourse ? "Apply for this course" : "Register for this event";
  const cta = open
    ? <ButtonLink href={`/register/${o.slug}`} variant="primary" block>{ctaLabel} →</ButtonLink>
    : <p style={{ margin: 0, color: "var(--hk-muted)" }}>Registration is closed.</p>;

  const batches = parseSchedule(cd?.schedule_text);
  let seatsLeft: number | null = null;
  if (!isCourse && o.capacity && supabaseConfigured) {
    const supabase = await createClient();
    const { data: taken } = await supabase.rpc("seats_taken", { p_offering_id: o.id });
    seatsLeft = Math.max(0, o.capacity - (taken ?? 0));
  }
  const where = o.is_online ? "Online" : o.venues ? `${o.venues.name}, ${o.venues.city}` : o.location_text;

  return (
    <SiteShell current={`/${section}`}>
      <PageBand
        eyebrow={isCourse ? `Course · ${cd?.duration_label ?? ""}` : [o.offering_types?.name, o.subtitle].filter(Boolean).join(" · ")}
        title={o.title}
        lead={o.summary}
        actions={open && <ButtonLink href={`/register/${o.slug}`} variant="on-dark">{isCourse ? "Apply now" : "Register"}</ButtonLink>}
      />
      <section className="hk-section">
        <div className="hk-container hk-detail">
          <div style={{ minWidth: 0 }}>
            {o.poster_url && (
              <div className="hk-detail__poster">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.poster_url} alt={`${o.title} poster`} />
              </div>
            )}
            <div className="hk-prose">
              {o.description
                ? o.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)
                : <p style={{ color: "var(--hk-muted)" }}>[Full description]</p>}
            </div>

            {cd && cd.outcomes.length > 0 && (
              <>
                <h2>What you will learn</h2>
                <ul className="hk-ticks">{cd.outcomes.map((x) => <li key={x}>{x}</li>)}</ul>
              </>
            )}

            {modules.length > 0 && (
              <>
                <h2>Course outline</h2>
                <ol className="hk-outline">
                  {modules.map((m) => (
                    <li key={m.position}><strong>{m.title}</strong>{m.description && <span>{m.description}</span>}</li>
                  ))}
                </ol>
              </>
            )}
          </div>

          <aside className="hk-glance">
            <div className="hk-glance__top">
              <span className="hk-glance__eyebrow">{isCourse ? "Course at a glance" : "Event details"}</span>
              {isCourse ? (
                <div className="hk-glance__stats">
                  {cd?.duration_label && <GlanceStat label="Duration" value={cd.duration_label} />}
                  {cd?.fee_text && <GlanceStat label="Fee" value={cd.fee_text} highlight={/free/i.test(cd.fee_text)} />}
                  {cd?.intake_label && <GlanceStat label="Next intake" value={cd.intake_label} />}
                </div>
              ) : o.starts_at && (
                <div className="hk-glance__date">
                  <div className="hk-glance__cal"><span>{month(o.starts_at)}</span><strong>{dayNum(o.starts_at)}</strong></div>
                  <div><strong>{weekday(o.starts_at)}</strong><span>{Icon.clock} {timeRange(o.starts_at, o.ends_at)}</span></div>
                </div>
              )}
            </div>

            <div className="hk-glance__body">
              {batches.length > 0 && (
                <section>
                  <h3>Class times</h3>
                  <div className="hk-batches">
                    {batches.map((b) => (
                      <div key={b.label + b.time} className="hk-batch">
                        <span className="hk-batch__label">{b.label}</span>
                        <div className="hk-batch__days">{b.days.map((d) => <span key={d}>{d}</span>)}</div>
                        {b.time && <span className="hk-batch__time">{Icon.clock}{b.time}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {o.speaker && (
                <section className="hk-glance__row">
                  <span className="hk-avatar" aria-hidden="true">{initials(o.speaker)}</span>
                  <div><h3>Speaker</h3><strong>{o.speaker}</strong></div>
                </section>
              )}

              {where && (
                <section className="hk-glance__row">
                  <span className="hk-glance__icon">{Icon.pin}</span>
                  <div style={{ minWidth: 0 }}>
                    <h3>{isCourse ? "Campus" : "Venue"}</h3>
                    <strong>{where}</strong>
                    {o.venues?.address && <div className="hk-glance__muted">{o.venues.address}</div>}
                    {o.venues?.map_url && <a className="hk-glance__dir" href={o.venues.map_url} target="_blank" rel="noreferrer">Get directions →</a>}
                  </div>
                </section>
              )}

              {cd?.eligibility && (
                <section>
                  <h3>Who it is for</h3>
                  <span className="hk-badge">{Icon.user}{cd.eligibility.replace(/\.$/, "")}</span>
                </section>
              )}

              {seatsLeft !== null && o.capacity && (
                <section>
                  <div className="hk-seats__head"><h3>Seats</h3><strong>{seatsLeft === 0 ? "Full, join the waitlist" : `${seatsLeft} of ${o.capacity} left`}</strong></div>
                  <div className="hk-seats" role="progressbar" aria-valuemin={0} aria-valuemax={o.capacity} aria-valuenow={o.capacity - seatsLeft}>
                    <span style={{ width: `${Math.min(100, Math.round(((o.capacity - seatsLeft) / o.capacity) * 100))}%` }} />
                  </div>
                </section>
              )}

              <div className="hk-glance__cta">
                {cta}
                {open && <span>{Icon.check} Takes 2 minutes. Your details are pre-filled.</span>}
                {o.qr_tickets_enabled && <span>{Icon.check} Entry with a QR ticket, sent after you register.</span>}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
