import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/admin", label: "Overview", admin: true },
  { href: "/admin/offerings", label: "Courses and events", admin: true },
  { href: "/admin/requests", label: "Requests", admin: true },
  { href: "/admin/fields", label: "Question library", admin: true },
  { href: "/admin/check-in", label: "Door check-in", admin: false },
];

const SOON = ["People", "Promote", "Admissions", "Homepage", "Admins"];

export function AdminShell({ children, isAdmin, current }: { children: ReactNode; isAdmin: boolean; current?: string }) {
  return (
    <div className="ad">
      <aside className="ad-side">
        <Link href="/admin" className="ad-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={34} height={34} />
          <span>Hikmah Admin</span>
        </Link>
        <nav aria-label="Admin">
          {NAV.filter((n) => isAdmin || !n.admin).map((n) => (
            <Link key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}>{n.label}</Link>
          ))}
          {isAdmin && (
            <div className="ad-side__soon">
              <span>Coming next</span>
              {SOON.map((s) => <span key={s}>{s}</span>)}
            </div>
          )}
        </nav>
        <Link href="/" className="ad-side__site">← View website</Link>
      </aside>
      <div className="ad-main">{children}</div>
    </div>
  );
}

export function AdminHeader({ title, crumb, actions, sub }: { title: string; crumb?: ReactNode; actions?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="ad-head">
      <div>
        {crumb && <div className="ad-crumb">{crumb}</div>}
        <h1>{title}</h1>
        {sub && <div className="ad-sub">{sub}</div>}
      </div>
      {actions && <div className="ad-head__actions">{actions}</div>}
    </header>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`ad-pill ad-pill--${status}`}>{status.replace("_", " ")}</span>;
}
