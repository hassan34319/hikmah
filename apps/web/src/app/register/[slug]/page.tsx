import { notFound, redirect } from "next/navigation";
import { ButtonLink, PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { getCurrentUser } from "@/lib/auth";
import { getOffering } from "@/lib/offerings";

export const dynamic = "force-dynamic";

// PLACEHOLDER: the registration form (prefilled fields + custom fields from form_fields)
// is built in the next part. This page already enforces sign-in so the flow can be tested.
export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const offering = await getOffering(slug);
  if (!offering) notFound();
  if (!(await getCurrentUser())) redirect(`/sign-in?next=/register/${slug}`);
  const back = offering.offering_types?.kind === "course" ? `/courses/${slug}` : `/events/${slug}`;
  return (
    <SiteShell>
      <PageBand eyebrow="Register" title={offering.title} lead="The registration form arrives in the next part of the build." />
      <section className="hk-section"><div className="hk-container"><ButtonLink href={back} variant="ghost">Back</ButtonLink></div></section>
    </SiteShell>
  );
}
