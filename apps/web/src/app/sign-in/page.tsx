import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <SiteShell>
      <PageBand eyebrow="Account" title="Sign in or create an account" lead="We email you a one time code. No password to remember, and your details fill every form for you." />
      <section className="hk-section"><div className="hk-container"><div className="hk-narrow hk-panel">
        <SignInForm next={next} />
      </div></div></section>
    </SiteShell>
  );
}
