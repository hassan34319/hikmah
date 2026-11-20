"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Json } from "@hikmah/db";
import { requireAdmin } from "@/lib/admin";
import { youtubeId, type SiteSettings } from "@/lib/settings";

export type HomepageState = { ok?: boolean; message?: string };

const t = (max: number) => z.string().trim().max(max);
const url = z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\//.test(v), "Links must start with https://");

const schema = z.object({
  hero: z.object({ eyebrow: t(80), title: t(120).min(3, "The hero needs a headline."), highlight: t(60), lead: t(400), image: t(500) }),
  sections: z.object({ stats: z.boolean(), partners: z.boolean(), thisWeek: z.boolean(), flagship: z.boolean(), ribbon: z.boolean(), courses: z.boolean(), community: z.boolean(), testimonials: z.boolean(), talks: z.boolean() }),
  stats: z.array(z.object({ value: t(20), label: t(60) })).max(4),
  ribbon: z.array(t(80)).max(12),
  partners: z.array(t(60)).max(30),
  testimonials: z.array(z.object({ quote: t(500), name: t(80), role: t(80) })).max(12),
  talks: z.array(z.object({ id: t(200), series: t(60), title: t(120), speaker: t(80) })).max(6),
  contact: z.object({ phone: t(30), whatsapp: url, email: t(120), youtube: url, instagram: url, linkedin: url }),
});

export async function saveHomepage(_prev: HomepageState, form: FormData): Promise<HomepageState> {
  const { supabase, userId } = await requireAdmin();
  let raw: unknown;
  try { raw = JSON.parse(String(form.get("settings") ?? "{}")); } catch { return { message: "Could not read the form. Refresh and try again." }; }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please check the fields." };
  const v: SiteSettings = parsed.data;

  // Clean lists: drop empty rows, turn any YouTube link into its video id.
  v.stats = v.stats.filter((s) => s.value || s.label);
  v.ribbon = v.ribbon.filter(Boolean);
  v.partners = v.partners.filter(Boolean);
  v.testimonials = v.testimonials.filter((x) => x.quote && x.name);
  const badTalk = v.talks.find((x) => x.id && !youtubeId(x.id));
  if (badTalk) return { message: `"${badTalk.id}" is not a YouTube link.` };
  v.talks = v.talks.filter((x) => x.id).map((x) => ({ ...x, id: youtubeId(x.id)! }));

  const image = form.get("hero_image");
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) return { message: "The hero photo must be an image." };
    if (image.size > 8 * 1024 * 1024) return { message: "The hero photo is larger than 8 MB." };
    const ext = (image.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `site/hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, image, { contentType: image.type });
    if (error) return { message: `Photo upload failed: ${error.message}` };
    v.hero.image = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("site_settings").upsert({ key: "site", value: v as unknown as Json, updated_by: userId });
  if (error) return { message: `Could not save: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. The website is updated." };
}
