import { ButtonLink, PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";

export default function NotAllowed() {
  return (
    <SiteShell>
      <PageBand eyebrow="Admin" title="You don't have access" lead="This area is for Hikmah staff. If you should have access, ask a super admin to add you." actions={<ButtonLink href="/" variant="on-dark">Back to the website</ButtonLink>} />
    </SiteShell>
  );
}
