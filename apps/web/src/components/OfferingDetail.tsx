import { notFound } from "next/navigation";
import { ButtonLink, PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { formatEventDate, getOffering } from "@/lib/offerings";

export async function OfferingDetail({ slug, section }: { slug: string; section: "courses" | "events" }) {
  const o = await getOffering(slug);
  const kind = section === "courses" ? "course" : "event";
  if (!o || o.offering_types?.kind !== kind) notFound();

  const when = formatEventDate(o.starts_at);
  const where = o.is_online ? "Online" : o.venues ? [o.venues.name, o.venues.city].filter(Boolean).join(", ") : o.location_text;
  const modules = [...(o.course_modules ?? [])].sort((a, b) => a.position - b.position);

  return (
    <SiteShell current={`/${section}`}>
      <PageBand
        eyebrow={kind === "course" ? (o.course_details?.duration_label ?? "Course") : (o.offering_types?.name ?? "Event")}
        title={o.title}
        lead={o.summary}
        actions={o.status === "published"
          ? <ButtonLink href={`/register/${o.slug}`} variant="on-dark">{kind === "course" ? "Apply now" : "Register"}</ButtonLink>
          : <span className="hk-band__lead">Registration is closed.</span>}
      />
      <section className="hk-section">
        <div className="hk-container" style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "start" }}>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            {o.description ? <p style={{ whiteSpace: "pre-line", marginTop: 0 }}>{o.description}</p> : <p style={{ marginTop: 0, color: "var(--hk-muted)" }}>[Full description]</p>}
            {modules.length > 0 && (
              <>
                <h2 style={{ fontSize: 24, margin: "32px 0 14px" }}>Course outline</h2>
                <ol style={{ paddingLeft: 20, display: "grid", gap: 8 }}>
                  {modules.map((m) => <li key={m.position}><strong>{m.title}</strong>{m.description && <> · {m.description}</>}</li>)}
                </ol>
              </>
            )}
          </div>
          <aside className="hk-panel" style={{ display: "grid", gap: 10 }}>
            {when && <div><strong>When</strong><br />{when}</div>}
            {where && <div><strong>Where</strong><br />{where}</div>}
            {o.speaker && <div><strong>Speaker</strong><br />{o.speaker}</div>}
            {o.course_details?.schedule_text && <div><strong>Schedule</strong><br />{o.course_details.schedule_text}</div>}
            {o.course_details?.fee_text && <div><strong>Fee</strong><br />{o.course_details.fee_text}</div>}
            {o.course_details?.intake_label && <div><strong>Next intake</strong><br />{o.course_details.intake_label}</div>}
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
