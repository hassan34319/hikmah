import type { Metadata } from "next";
import { PageBand } from "@hikmah/ui";
import { OfferingGrid } from "@/components/OfferingGrid";
import { SiteShell } from "@/components/SiteShell";
import { listOfferings } from "@/lib/offerings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const courses = await listOfferings("course");
  return (
    <SiteShell current="/courses">
      <PageBand eyebrow="Courses" title="Study with Hikmah" lead="Structured programs with admissions, from one year to eight." />
      <section className="hk-section"><div className="hk-container">
        <OfferingGrid items={courses} empty="Courses will appear here once they are published." />
      </div></section>
    </SiteShell>
  );
}
