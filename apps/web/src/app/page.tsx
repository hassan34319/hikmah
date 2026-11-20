import { ButtonLink, PageBand } from "@hikmah/ui";
import { OfferingGrid } from "@/components/OfferingGrid";
import { SiteShell } from "@/components/SiteShell";
import { listOfferings } from "@/lib/offerings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [courses, events] = await Promise.all([listOfferings("course", 4), listOfferings("event", 4)]);
  return (
    <SiteShell current="/">
      <PageBand
        hero
        eyebrow="Hikmah Institute · Karachi"
        title="Rediscover your deen, with depth and clarity"
        lead="Authentic Islamic knowledge for contemporary challenges. Structured courses for every stage of life, and events open to everyone."
        actions={<>
          <ButtonLink href="/courses" variant="on-dark">Explore courses</ButtonLink>
          <ButtonLink href="/events" variant="outline-dark">Upcoming events</ButtonLink>
        </>}
      />
      <section className="hk-section">
        <div className="hk-container">
          <div className="hk-section__head">
            <div><h2>A course for every stage of life</h2><p>From a one year foundation to the full Darse Nizami.</p></div>
            <ButtonLink href="/courses" variant="ghost" size="sm">View all courses</ButtonLink>
          </div>
          <OfferingGrid items={courses} empty="Courses will appear here once they are published." />
        </div>
      </section>
      <section className="hk-section hk-section--tint">
        <div className="hk-container">
          <div className="hk-section__head">
            <div><h2>Upcoming events</h2><p>Talks, workshops and halaqahs. Register in a minute with your saved details.</p></div>
            <ButtonLink href="/events" variant="ghost" size="sm">View all events</ButtonLink>
          </div>
          <OfferingGrid items={events} empty="No upcoming events right now. Check back soon." />
        </div>
      </section>
    </SiteShell>
  );
}
