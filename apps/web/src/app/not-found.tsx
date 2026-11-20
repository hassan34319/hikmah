import { ButtonLink, PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <PageBand title="Page not found" lead="This page may have moved or is no longer available." actions={<ButtonLink href="/" variant="on-dark">Go home</ButtonLink>} />
    </SiteShell>
  );
}
