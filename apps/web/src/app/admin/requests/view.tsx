import type { RequestKind } from "@hikmah/db";
import { fmtDate } from "@/lib/time";

type Payload = Record<string, unknown>;
type Child = Record<string, string>;
type Person = { name?: string; phone?: string; email?: string; qualification?: string; institution?: string };

/** Turns a request's payload into label/value rows, grouped where it helps (Hifz children). */
export function requestSections(kind: RequestKind, p: Payload): { title?: string; rows: [string, string][] }[] {
  const v = (x: unknown) => (x === null || x === undefined || x === "" ? "" : String(x));
  if (kind === "mentorship") {
    return [{ rows: [["Area of mentorship", v(p.area)], ["Gender", v(p.gender)], ["Date of birth", p.date_of_birth ? fmtDate(String(p.date_of_birth), { day: "numeric", month: "short", year: "numeric" }) : ""], ["Course", v(p.course)], ["Batch", v(p.batch)], ["Enrollment", v(p.enrollment)]] }];
  }
  if (kind === "corporate") {
    return [{ rows: [["Organisation", v(p.organisation)], ["Designation", v(p.designation)], ["Session format", v(p.format)], ["Preferred date", p.preferred_date ? fmtDate(`${String(p.preferred_date)}T12:00:00+05:00`, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : ""], ["Preferred time", v(p.preferred_time)], ["Preferred topic", v(p.topic)]] }];
  }
  if (kind === "hifz") {
    const children = (Array.isArray(p.children) ? p.children : []) as Child[];
    const father = (p.father ?? {}) as Person;
    const mother = (p.mother ?? {}) as Person;
    const a = (p.address ?? {}) as Record<string, string>;
    return [
      ...children.map((c, i) => ({
        title: `Child ${i + 1}: ${c.name}`,
        rows: [["Track", c.track], ["Age", c.age], ["Gender", c.gender], ["School", [c.school, c.grade].filter(Boolean).join(", ") || (c.in_school === "No" ? "Not in school" : "")],
          ["Prior Quran study", c.prior_study === "Yes" ? [c.level, c.paras ? `${c.paras} paras` : "", c.institute].filter(Boolean).join(" · ") : v(c.prior_study)]] as [string, string][],
      })),
      { title: "Father / guardian", rows: [["Name", v(father.name)], ["Phone", v(father.phone)], ["Email", v(father.email)], ["Qualification", [father.qualification, father.institution].filter(Boolean).join(", ")]] },
      { title: "Mother / guardian", rows: [["Name", v(mother.name)], ["Phone", v(mother.phone)], ["Email", v(mother.email)], ["Qualification", [mother.qualification, mother.institution].filter(Boolean).join(", ")]] },
      { title: "Address", rows: [["Address", [a.address, a.area, a.city].filter(Boolean).join(", ")]] },
    ];
  }
  return [{ rows: Object.entries(p).map(([k, x]) => [k, v(x)] as [string, string]) }];
}

/** One-line summary for the list. */
export function requestSummary(kind: RequestKind, p: Payload) {
  if (kind === "mentorship") return String(p.area ?? "");
  if (kind === "corporate") return [p.organisation, p.format].filter(Boolean).join(" · ");
  if (kind === "hifz") {
    const kids = (Array.isArray(p.children) ? p.children : []) as Child[];
    return kids.map((c) => `${c.name} (${c.age}, ${c.track})`).join(", ");
  }
  return "";
}
