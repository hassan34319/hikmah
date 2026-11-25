import Link from "next/link";
import type { ReactNode } from "react";

const NAV = {
  learn: [
    ["/learn", "Home"], ["/learn/materials", "Materials"], ["/learn/assignments", "Assignments"],
    ["/learn/quizzes", "Quizzes"], ["/learn/timetable", "Timetable"], ["/learn/results", "Results"],
  ],
  teach: [
    ["/teach", "Home"], ["/teach/materials", "Materials"], ["/teach/assignments", "Assignments"],
    ["/teach/quizzes", "Quizzes"], ["/teach/timetable", "Timetable"],
  ],
} as const;

export function LmsShell({ mode, current, name, children, other, admin }: {
  mode: "learn" | "teach"; current: string; name: string; children: ReactNode;
  /** Link to the other portal when the person is both (e.g. a teacher who is also a student). */
  other?: boolean; admin?: boolean;
}) {
  return (
    <div className="lm">
      <header className="lm-top">
        <div className="lm-top__in">
          <Link href={`/${mode}`} className="lm-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={30} height={30} />
            <span>{mode === "learn" ? "My classes" : "Teaching"}</span>
          </Link>
          <nav className="lm-nav" aria-label={mode === "learn" ? "My classes" : "Teaching"}>
            {NAV[mode].map(([href, label]) => (
              <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>{label}</Link>
            ))}
          </nav>
          <div className="lm-top__me">
            {other && <Link href={mode === "learn" ? "/teach" : "/learn"} className="lm-switch">{mode === "learn" ? "Teaching" : "My classes"}</Link>}
            {admin && <Link href="/admin/lms" className="lm-switch">Admin</Link>}
            <Link href="/account" className="lm-me" title="Your account">{name.split(" ")[0] || "Account"}</Link>
          </div>
        </div>
      </header>
      <main className="lm-main">{children}</main>
    </div>
  );
}

export function LmsHead({ title, sub, actions, crumb }: { title: string; sub?: ReactNode; actions?: ReactNode; crumb?: ReactNode }) {
  return (
    <div className="lm-head">
      <div>
        {crumb && <div className="ad-crumb">{crumb}</div>}
        <h1>{title}</h1>
        {sub && <p className="lm-sub">{sub}</p>}
      </div>
      {actions && <div className="lm-head__actions">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="lm-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
