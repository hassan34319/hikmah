import { OfferingCard } from "@hikmah/ui";
import { formatEventDate, type OfferingWithType } from "@/lib/offerings";

export function OfferingGrid({ items, empty }: { items: OfferingWithType[]; empty: string }) {
  if (items.length === 0) return <p style={{ color: "var(--hk-muted)" }}>{empty}</p>;
  return (
    <div className="hk-grid">
      {items.map((o) => {
        const isEvent = o.offering_types?.kind === "event";
        return (
          <OfferingCard
            key={o.id}
            href={`/${isEvent ? "events" : "courses"}/${o.slug}`}
            tag={isEvent ? [o.offering_types?.name, o.subtitle].filter(Boolean).join(" · ") : (o.subtitle ?? "Course")}
            title={o.title}
            summary={o.summary}
            meta={isEvent ? formatEventDate(o.starts_at) : null}
            imageUrl={o.poster_url}
            cta={isEvent ? "Register" : "View course and apply"}
          />
        );
      })}
    </div>
  );
}
