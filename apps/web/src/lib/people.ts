import type { Json } from "@hikmah/db";

/** Filters on the People page live in the URL, so a filtered view can be bookmarked or shared between admins. */
export type Params = Record<string, string | string[] | undefined>;

export type EventMode = "registered" | "checked_in" | "feedback";
export type EventRule = {
  mode: EventMode | "not_registered";
  offering_ids?: string[]; type_slugs?: string[]; series?: string; since?: string; until?: string; min_count?: number;
};
export type PeopleRules = {
  q?: string; areas?: string[]; interests?: string[]; occupations?: string[]; genders?: string[];
  age_min?: number; age_max?: number; email_opt_in?: boolean; whatsapp_opt_in?: boolean;
  applied_course?: "yes" | "no"; events?: EventRule[];
};

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const int = (v: string | string[] | undefined) => { const n = Number(one(v)); return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined; };
const yesNo = (v: string | string[] | undefined) => (one(v) === "yes" ? true : one(v) === "no" ? false : undefined);
const date = (v: string | string[] | undefined) => { const s = one(v); return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined; };

export function rulesFromParams(sp: Params): PeopleRules {
  const r: PeopleRules = {};
  const q = one(sp.q); if (q) r.q = q.slice(0, 100);
  const areas = list(sp.area); if (areas.length) r.areas = areas;
  const interests = list(sp.int); if (interests.length) r.interests = interests;
  const occ = list(sp.occ); if (occ.length) r.occupations = occ;
  const g = list(sp.g); if (g.length) r.genders = g;
  const amin = int(sp.amin); if (amin) r.age_min = amin;
  const amax = int(sp.amax); if (amax) r.age_max = amax;
  const eo = yesNo(sp.eo); if (eo !== undefined) r.email_opt_in = eo;
  const wo = yesNo(sp.wo); if (wo !== undefined) r.whatsapp_opt_in = wo;
  const ac = one(sp.ac); if (ac === "yes" || ac === "no") r.applied_course = ac;

  const events: EventRule[] = [];
  const mode = one(sp.em) as EventMode | undefined;
  if (mode === "registered" || mode === "checked_in" || mode === "feedback") {
    const e: EventRule = { mode };
    const ids = list(sp.ev); if (ids.length) e.offering_ids = ids;
    const types = list(sp.et); if (types.length) e.type_slugs = types;
    const series = one(sp.es); if (series) e.series = series.slice(0, 80);
    const since = date(sp.since); if (since) e.since = since;
    const until = date(sp.until); if (until) e.until = until;
    const min = int(sp.min); if (min && min > 1) e.min_count = min;
    events.push(e);
  }
  const not = list(sp.x); if (not.length) events.push({ mode: "not_registered", offering_ids: not });
  if (events.length) r.events = events;
  return r;
}

/** Inverse of rulesFromParams, used to load a saved group back into the filter form. */
export function paramsFromRules(r: PeopleRules): Record<string, string> {
  const p: Record<string, string> = {};
  if (r.q) p.q = r.q;
  if (r.areas?.length) p.area = r.areas.join(", ");
  if (r.interests?.length) p.int = r.interests.join(",");
  if (r.occupations?.length) p.occ = r.occupations.join(",");
  if (r.genders?.length) p.g = r.genders.join(",");
  if (r.age_min) p.amin = String(r.age_min);
  if (r.age_max) p.amax = String(r.age_max);
  if (r.email_opt_in !== undefined) p.eo = r.email_opt_in ? "yes" : "no";
  if (r.whatsapp_opt_in !== undefined) p.wo = r.whatsapp_opt_in ? "yes" : "no";
  if (r.applied_course) p.ac = r.applied_course;
  for (const e of r.events ?? []) {
    if (e.mode === "not_registered") { if (e.offering_ids?.length) p.x = e.offering_ids.join(","); continue; }
    p.em = e.mode;
    if (e.offering_ids?.length) p.ev = e.offering_ids.join(",");
    if (e.type_slugs?.length) p.et = e.type_slugs.join(",");
    if (e.series) p.es = e.series;
    if (e.since) p.since = e.since;
    if (e.until) p.until = e.until;
    if (e.min_count) p.min = String(e.min_count);
  }
  return p;
}

export const toQuery = (p: Record<string, string>) => new URLSearchParams(p).toString();
export const asJson = (r: PeopleRules) => r as unknown as Json;
export const isEmpty = (r: PeopleRules) => Object.keys(r).length === 0;

/** A short sentence describing a rule set, shown on saved groups and invite history. */
export function describeRules(r: PeopleRules, names: { offering: (id: string) => string; type: (slug: string) => string }) {
  const bits: string[] = [];
  const e = r.events?.find((x) => x.mode !== "not_registered");
  if (e) {
    const what = e.offering_ids?.length ? e.offering_ids.map(names.offering).join(" or ")
      : e.series ? e.series : e.type_slugs?.length ? e.type_slugs.map(names.type).join(" or ") : "any event";
    const verb = e.mode === "checked_in" ? "Checked in at" : e.mode === "feedback" ? "Gave feedback on" : "Registered for";
    bits.push(`${verb} ${what}${e.min_count ? ` (${e.min_count}+ times)` : ""}${e.since ? ` since ${e.since}` : ""}${e.until ? ` until ${e.until}` : ""}`);
  }
  const x = r.events?.find((v) => v.mode === "not_registered");
  if (x?.offering_ids?.length) bits.push(`not registered for ${x.offering_ids.map(names.offering).join(" or ")}`);
  if (r.areas?.length) bits.push(`in ${r.areas.join(" or ")}`);
  if (r.interests?.length) bits.push(`interested in ${r.interests.join(" or ")}`);
  if (r.occupations?.length) bits.push(r.occupations.join(" or "));
  if (r.genders?.length) bits.push(r.genders.join(" or "));
  if (r.age_min || r.age_max) bits.push(`age ${r.age_min ?? 0}${r.age_max ? ` to ${r.age_max}` : "+"}`);
  if (r.applied_course) bits.push(r.applied_course === "yes" ? "applied for a course" : "never applied for a course");
  if (r.email_opt_in !== undefined) bits.push(r.email_opt_in ? "email opted in" : "email opted out");
  if (r.whatsapp_opt_in !== undefined) bits.push(r.whatsapp_opt_in ? "WhatsApp opted in" : "WhatsApp opted out");
  if (r.q) bits.push(`matching "${r.q}"`);
  const s = bits.join(", ");
  return s ? s[0]!.toUpperCase() + s.slice(1) : "Everyone with a completed profile";
}

export function ageFrom(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}
