import Link from "next/link";
import type { ReactNode } from "react";

export interface NavItem { href: string; label: string }

/** Site header. `overlay` makes it transparent so it sits on top of the homepage hero photo. */
export function Header({ nav, actions, current, brand = "Hikmah Institute", overlay }: {
  nav: NavItem[]; actions?: ReactNode; current?: string; brand?: string; overlay?: boolean;
}) {
  return (
    <header className={`hk-header${overlay ? " hk-header--overlay" : ""}`}>
      <div className="hk-container hk-header__inner">
        <Link href="/" className="hk-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={40} height={40} />
          <span>{brand}</span>
        </Link>
        <nav className="hk-nav" aria-label="Main">
          {nav.map((item) =>
            item.href.startsWith("http")
              ? <a key={item.href} href={item.href}>{item.label}</a>
              : <Link key={item.href} href={item.href} aria-current={current === item.href ? "page" : undefined}>{item.label}</Link>,
          )}
        </nav>
        <div className="hk-header__actions">{actions}</div>
      </div>
    </header>
  );
}
