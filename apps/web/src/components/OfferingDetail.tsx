import { notFound } from "next/navigation";
import { ButtonLink, PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { formatEventDate, getOffering } from "@/lib/offerings";

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
    ? <ButtonLink href={`/register/${o.slug}`} variant="primary" block>{ctaLabel}</ButtonLink>
    : <p style={{ margin: 0, color: "var(--hk-muted)" }}>Registration is closed.</p>;

  const when = formatEventDate(o.starts_at);
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

          <aside className="hk-panel hk-facts">
            <dl>
              {when && <div><dt>When</dt><dd>{when}</dd></div>}
              {o.speaker && <div><dt>Speaker</dt><dd>{o.speaker}</dd></div>}
              {cd?.duration_label && <div><dt>Duration</dt><dd>{cd.duration_label}</dd></div>}
              {cd?.schedule_text && <div><dt>Class times</dt><dd>{cd.schedule_text}</dd></div>}
              {where && (
                <div>
                  <dt>{isCourse ? "Campus" : "Where"}</dt>
                  <dd>
                    {where}
                    {o.venues?.address && <><br /><span style={{ color: "var(--hk-muted)" }}>{o.venues.address}</span></>}
                    {o.venues?.map_url && <><br /><a href={o.venues.map_url} target="_blank" rel="noreferrer">Open in Google Maps</a></>}
                  </dd>
                </div>
              )}
              {cd?.eligibility && <div><dt>Who it is for</dt><dd>{cd.eligibility}</dd></div>}
              {cd?.fee_text && <div><dt>Fee</dt><dd>{cd.fee_text}</dd></div>}
              {cd?.intake_label && <div><dt>Next intake</dt><dd>{cd.intake_label}</dd></div>}
              {o.capacity && !isCourse && <div><dt>Seats</dt><dd>{o.capacity}</dd></div>}
            </dl>
            {cta}
            {o.qr_tickets_enabled && <p style={{ margin: 0, fontSize: 14, color: "var(--hk-muted)" }}>Entry with a QR ticket, sent after you register.</p>}
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
