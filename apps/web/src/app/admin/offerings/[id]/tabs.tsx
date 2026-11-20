import Link from "next/link";

export function OfferingTabs({ id, current, kind }: { id: string; current: "details" | "form" | "responses" | "feedback"; kind: "course" | "event" }) {
  const tabs = [
    ["details", "Details", `/admin/offerings/${id}`],
    ["form", kind === "course" ? "Application form" : "Registration form", `/admin/offerings/${id}/form`],
    ["responses", kind === "course" ? "Applications" : "Responses", `/admin/offerings/${id}/responses`],
    ...(kind === "event" ? [["feedback", "Feedback", `/admin/offerings/${id}/feedback`] as const] : []),
  ] as const;
  return (
    <nav className="ad-tabs" aria-label="Sections">
      {tabs.map(([key, label, href]) => <Link key={key} href={href} aria-current={current === key ? "page" : undefined}>{label}</Link>)}
    </nav>
  );
}
