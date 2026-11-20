import type { ReactNode } from "react";
import { ButtonLink, Footer, Header } from "@hikmah/ui";
import { getCurrentUser } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/events", label: "Events" },
];

export async function SiteShell({ children, current }: { children: ReactNode; current?: string }) {
  const user = await getCurrentUser();
  return (
    <div className="hk-page">
      <Header
        nav={NAV}
        current={current}
        actions={user
          ? <ButtonLink href="/account" variant="outline-dark" size="sm">My account</ButtonLink>
          : <ButtonLink href="/sign-in" variant="on-dark" size="sm">Sign in</ButtonLink>}
      />
      {!supabaseConfigured && (
        <div className="hk-container" style={{ paddingTop: 16 }}>
          <div className="hk-alert hk-alert--info">
            Supabase is not connected yet. Copy apps/web/.env.example to .env.local and add the project URL and publishable key.
          </div>
        </div>
      )}
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}
