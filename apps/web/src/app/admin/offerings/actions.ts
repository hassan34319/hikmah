"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, slugify } from "@/lib/admin";
import { fromPktInput } from "@/lib/time";

export type SaveState = { ok?: boolean; message?: string; errors?: Record<string, string> };

const DEFAULT_FORMS = {
  event: [["full_name", true], ["email", true], ["phone", true], ["occupation_type", false], ["heard_from", false]],
  course: [["full_name", true], ["email", true], ["phone", true], ["date_of_birth", true], ["preferred_campus", true], ["preferred_batch", true], ["prior_study", true], ["why_join", true]],
} as const;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const lines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean);

export async function saveOffering(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { supabase, userId } = await requireAdmin();
  const id = str(form, "id") || null;
  const kind = str(form, "kind") === "course" ? "course" : "event";
  const intent = str(form, "intent"); // "draft" | "publish" | "save" | "unpublish"
  const errors: Record<string, string> = {};

  const title = str(form, "title");
  if (title.length < 3) errors.title = "Give it a title.";
  const slug = slugify(str(form, "slug") || title);
  if (!slug) errors.slug = "Add a page link.";
  const typeId = str(form, "type_id");
  if (!typeId) errors.type_id = "Choose a type.";

  const startsAt = fromPktInput(form.get("starts_at"));
  const endsAt = fromPktInput(form.get("ends_at"));
  if (kind === "event" && !startsAt) errors.starts_at = "Events need a start date and time.";
  if (startsAt && endsAt && endsAt < startsAt) errors.ends_at = "Ends before it starts.";

  const capRaw = str(form, "capacity");
  const capacity = capRaw ? Number(capRaw) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) errors.capacity = "Whole number above 0, or leave empty for no limit.";

  const venue = str(form, "venue");
  const poster = form.get("poster");
  if (poster instanceof File && poster.size > 0) {
    if (!poster.type.startsWith("image/")) errors.poster = "Poster must be an image (JPG, PNG or WebP).";
    if (poster.size > 8 * 1024 * 1024) errors.poster = "Poster is larger than 8 MB.";
  }
  if (Object.keys(errors).length) return { errors, message: "Please fix the highlighted fields." };

  const { data: existing } = id
    ? await supabase.from("offerings").select("status, published_at").eq("id", id).maybeSingle()
    : { data: null };
  let status = (existing?.status ?? "draft") as "draft" | "published" | "closed" | "archived";
  if (intent === "publish") status = "published";
  if (intent === "draft" || intent === "unpublish") status = "draft";
  if (intent === "archive") status = "archived";

  const row = {
    type_id: typeId,
    slug,
    title,
    subtitle: str(form, "subtitle") || null,
    summary: str(form, "summary") || null,
    description: str(form, "description") || null,
    speaker: str(form, "speaker") || null,
    starts_at: startsAt,
    ends_at: endsAt,
    venue_id: venue && venue !== "online" && venue !== "other" ? venue : null,
    is_online: venue === "online",
    location_text: venue === "other" ? str(form, "location_text") || null : null,
    capacity,
    registration_opens_at: fromPktInput(form.get("registration_opens_at")),
    registration_closes_at: fromPktInput(form.get("registration_closes_at")),
    status,
    pinned: form.get("pinned") === "on",
    sort_order: Number(str(form, "sort_order") || 0) || 0,
    qr_tickets_enabled: form.get("qr_tickets_enabled") === "on",
    send_confirmation_email: form.get("send_confirmation_email") === "on",
    published_at: status === "published" ? existing?.published_at ?? new Date().toISOString() : existing?.published_at ?? null,
  };

  let offeringId = id;
  if (id) {
    const { error } = await supabase.from("offerings").update(row).eq("id", id);
    if (error) return failure(error);
  } else {
    const { data, error } = await supabase.from("offerings").insert({ ...row, created_by: userId }).select("id").single();
    if (error || !data) return failure(error);
    offeringId = data.id;
    // Start every new form with sensible default questions.
    const keys = DEFAULT_FORMS[kind].map(([k]) => k);
    const { data: fields } = await supabase.from("fields").select("id, key").in("key", keys as unknown as string[]);
    const byKey = new Map((fields ?? []).map((f) => [f.key, f.id]));
    const rows = DEFAULT_FORMS[kind].flatMap(([k, req], i) => byKey.get(k) ? [{ offering_id: data.id, field_id: byKey.get(k)!, position: i + 1, required: req }] : []);
    if (rows.length) await supabase.from("form_fields").insert(rows);
  }

  if (poster instanceof File && poster.size > 0 && offeringId) {
    const ext = (poster.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `offerings/${offeringId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, poster, { contentType: poster.type, upsert: false });
    if (upErr) return { ok: false, message: `Saved, but the poster did not upload: ${upErr.message}` };
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    await supabase.from("offerings").update({ poster_url: pub.publicUrl }).eq("id", offeringId);
  } else if (form.get("remove_poster") === "on" && offeringId) {
    await supabase.from("offerings").update({ poster_url: null }).eq("id", offeringId);
  }

  if (kind === "course" && offeringId) {
    await supabase.from("course_details").upsert({
      offering_id: offeringId,
      code: str(form, "code") || null,
      duration_label: str(form, "duration_label") || null,
      duration_months: Number(str(form, "duration_months")) || null,
      level: str(form, "level") || null,
      schedule_text: str(form, "schedule_text") || null,
      fee_text: str(form, "fee_text") || null,
      eligibility: str(form, "eligibility") || null,
      intake_label: str(form, "intake_label") || null,
      outcomes: lines(str(form, "outcomes")),
    });
    await supabase.from("course_modules").delete().eq("offering_id", offeringId);
    const modules = lines(str(form, "outline")).map((l, i) => {
      const [t, ...rest] = l.split("|");
      return { offering_id: offeringId!, position: i + 1, title: (t ?? "").trim(), description: rest.join("|").trim() || null };
    }).filter((m) => m.title);
    if (modules.length) await supabase.from("course_modules").insert(modules);
  }

  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/offerings/${offeringId}?saved=new`);
  return { ok: true, message: status === "published" ? "Saved. It's live on the website." : "Saved as a draft. Only admins can see it." };
}

function failure(error: { code?: string; message: string } | null): SaveState {
  if (error?.code === "23505") return { errors: { slug: "Another course or event already uses this page link." }, message: "Please fix the highlighted fields." };
  console.error("saveOffering", error?.message);
  return { message: `Could not save: ${error?.message ?? "unknown error"}` };
}
