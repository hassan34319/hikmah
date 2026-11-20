import type { ReactNode } from "react";
import { ButtonLink, Footer, Header } from "@hikmah/ui";
import { getCurrentUser } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";
import { CONTACT, NAV } from "@/lib/site-content";

export async function SiteShell({ children, current, overlayHeader }: { children: ReactNode; current?: string; overlayHeader?: boolean }) {
  const user = await getCurrentUser();
  return (
    <div className="hk-page" style={{ position: "relative" }}>
      <Header
        nav={NAV}
        current={current}
        overlay={overlayHeader}
        actions={<>
          {user
            ? <ButtonLink href="/account" variant="outline-dark" size="sm">My account</ButtonLink>
            : <ButtonLink href="/sign-in" variant="outline-dark" size="sm">Sign in</ButtonLink>}
          <span className="hk-hide-sm"><ButtonLink href="/courses" variant="on-dark" size="sm">Apply now →</ButtonLink></span>
        </>}
      />
      <main style={{ flex: 1 }}>{children}</main>
      {!supabaseConfigured && (
        <div className="hk-container" style={{ paddingBottom: 16 }}>
          <div className="hk-alert hk-alert--info">
            Supabase is not connected yet. Copy apps/web/.env.example to .env.local and add the project URL and publishable key.
          </div>
        </div>
      )}
      <Footer
        phone={CONTACT.phone}
        email={CONTACT.email}
        whatsapp={CONTACT.whatsapp}
        campuses={CONTACT.campuses}
        socials={CONTACT.socials}
        learn={[{ href: "/courses", label: "Courses" }, { href: "/events", label: "Events" }, ...NAV.slice(2, 4)]}
        campusImage="/home/campus.jpg"
      />
    </div>
  );
}
