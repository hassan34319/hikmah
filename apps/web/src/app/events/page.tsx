import type { Metadata } from "next";
import { PageBand } from "@hikmah/ui";
import { OfferingGrid } from "@/components/OfferingGrid";
import { SiteShell } from "@/components/SiteShell";
import { listOfferings } from "@/lib/offerings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const events = await listOfferings("event");
  return (
    <SiteShell current="/events">
      <PageBand eyebrow="Events" title="Upcoming events" lead="Talks, workshops, halaqahs and khidmah drives. Open to everyone." />
      <section className="hk-section"><div className="hk-container">
        <OfferingGrid items={events} empty="No upcoming events right now. Check back soon." />
      </div></section>
    </SiteShell>
  );
}
