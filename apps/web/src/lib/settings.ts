import { WORK_PARTNERS } from "./programs-content";
import { CONTACT, RIBBON, STATS, TALKS, TESTIMONIALS } from "./site-content";
import { supabaseConfigured } from "./env";
import { publicClient } from "./supabase/public";

export type Testimonial = { quote: string; name: string; role: string };
export type Talk = { id: string; series: string; title: string; speaker: string };
export type Stat = { value: string; label: string };

export type SiteSettings = {
  hero: { eyebrow: string; title: string; highlight: string; lead: string; image: string };
  sections: { stats: boolean; partners: boolean; thisWeek: boolean; flagship: boolean; ribbon: boolean; courses: boolean; community: boolean; testimonials: boolean; talks: boolean };
  stats: Stat[];
  ribbon: string[];
  partners: string[];
  testimonials: Testimonial[];
  talks: Talk[];
  contact: { phone: string; whatsapp: string; email: string; youtube: string; instagram: string; linkedin: string };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  hero: {
    eyebrow: "Ilm · Dawah · Islah · Khidmah",
    title: "Rediscover your deen, with",
    highlight: "Hikmah.",
    lead: "Classical Islamic scholarship, taught for students and working professionals in Karachi. Evenings and weekends, at our Sindhi Muslim Society and DHA campuses.",
    image: "/home/hero.jpg",
  },
  sections: { stats: true, partners: false, thisWeek: true, flagship: true, ribbon: true, courses: true, community: true, testimonials: true, talks: true },
  stats: STATS,
  ribbon: RIBBON,
  partners: WORK_PARTNERS,
  testimonials: TESTIMONIALS,
  talks: TALKS,
  contact: {
    phone: CONTACT.phone,
    whatsapp: CONTACT.whatsapp,
    email: CONTACT.email,
    youtube: CONTACT.socials.find((s) => s.label === "YouTube")?.href ?? "",
    instagram: CONTACT.socials.find((s) => s.label === "Instagram")?.href ?? "",
    linkedin: CONTACT.socials.find((s) => s.label === "LinkedIn")?.href ?? "",
  },
};

/** Saved homepage settings merged over the defaults, so a missing or partial save never breaks a page. */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!supabaseConfigured) return DEFAULT_SETTINGS;
  try {
    const { data } = await publicClient().from("site_settings").select("value").eq("key", "site").maybeSingle();
    const v = (data?.value ?? {}) as Partial<SiteSettings>;
    return {
      hero: { ...DEFAULT_SETTINGS.hero, ...v.hero },
      sections: { ...DEFAULT_SETTINGS.sections, ...v.sections },
      stats: v.stats?.length ? v.stats : DEFAULT_SETTINGS.stats,
      ribbon: v.ribbon?.length ? v.ribbon : DEFAULT_SETTINGS.ribbon,
      partners: v.partners ?? DEFAULT_SETTINGS.partners,
      testimonials: v.testimonials ?? DEFAULT_SETTINGS.testimonials,
      talks: v.talks ?? DEFAULT_SETTINGS.talks,
      contact: { ...DEFAULT_SETTINGS.contact, ...v.contact },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Pulls the video id out of any YouTube link (watch, youtu.be, shorts, live) or accepts a bare id. */
export function youtubeId(input: string) {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export function socialLinks(c: SiteSettings["contact"]) {
  return [
    { label: "YouTube", href: c.youtube },
    { label: "Instagram", href: c.instagram },
    { label: "LinkedIn", href: c.linkedin },
  ].filter((s) => s.href);
}
