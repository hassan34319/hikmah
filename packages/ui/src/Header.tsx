import Link from "next/link";
import type { ReactNode } from "react";

export interface NavItem { href: string; label: string }

export function Header({ nav, actions, current, brand = "Hikmah Institute" }: {
  nav: NavItem[]; actions?: ReactNode; current?: string; brand?: string;
}) {
  return (
    <header className="hk-header">
      <div className="hk-container hk-header__inner">
        <Link href="/" className="hk-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={36} height={36} />
          <span>{brand}</span>
        </Link>
        <nav className="hk-nav" aria-label="Main">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} aria-current={current === item.href ? "page" : undefined}>{item.label}</Link>
          ))}
        </nav>
        <div className="hk-header__actions">{actions}</div>
      </div>
    </header>
  );
}
