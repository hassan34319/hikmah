"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { renderInviteEmail } from "@hikmah/emails";
import type { PersonResult } from "@hikmah/db";
import { requireAdmin } from "@/lib/admin";
import { emailLogoUrl, sendEmailBatch } from "@/lib/email";
import { SITE_URL } from "@/lib/env";
import { asJson, paramsFromRules, toQuery, type PeopleRules } from "@/lib/people";
import { fmtDate } from "@/lib/time";

const readRules = (form: FormData): PeopleRules => {
  try { const r = JSON.parse(String(form.get("rules") ?? "{}")); return r && typeof r === "object" ? r : {}; } catch { return {}; }
};

export async function saveSegment(form: FormData) {
  const { supabase, userId } = await requireAdmin();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const rules = readRules(form);
  const id = String(form.get("segment_id") ?? "");
  if (!name) return;
  let segId = id;
  if (id && form.get("mode") === "update") {
    await supabase.from("segments").update({ name, rules: asJson(rules) }).eq("id", id);
  } else {
    const { data } = await supabase.from("segments").insert({ name, rules: asJson(rules), created_by: userId }).select("id").single();
    segId = data?.id ?? "";
  }
  revalidatePath("/admin/people");
  redirect(`/admin/people?${toQuery({ ...paramsFromRules(rules), seg: segId })}`);
}

export async function deleteSegment(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("segments").delete().eq("id", String(form.get("segment_id")));
  revalidatePath("/admin/people");
  redirect("/admin/people");
}

export type InviteState = { ok?: boolean; message?: string };

export async function sendInvite(_prev: InviteState, form: FormData): Promise<InviteState> {
  const { supabase, userId } = await requireAdmin();
  const rules = readRules(form);
  const offeringId = String(form.get("offering_id") ?? "");
  const message = String(form.get("message") ?? "").trim().slice(0, 2000) || null;
  const subjectIn = String(form.get("subject") ?? "").trim().slice(0, 150);
  const segmentId = String(form.get("segment_id") ?? "") || null;
  if (!offeringId) return { message: "Choose the course or event to invite people to." };
  if (form.get("confirm") !== "on") return { message: "Tick the box to confirm before sending." };

  const [{ data: offering }, { data: people, error }, { data: already }] = await Promise.all([
    supabase.from("offerings").select("id, slug, title, subtitle, speaker, starts_at, poster_url, is_online, location_text, venues(name), offering_types(kind)").eq("id", offeringId).single(),
    supabase.rpc("people_search", { p_rules: asJson(rules) }),
    supabase.from("registrations").select("user_id").eq("offering_id", offeringId).neq("status", "cancelled"),
  ]);
  if (!offering) return { message: "That course or event was not found." };
  if (error) return { message: `Could not load the group: ${error.message}` };
  const skip = new Set((already ?? []).map((r) => r.user_id));
  const list = ((people ?? []) as PersonResult[]).filter((p) => p.email_opt_in && p.email && !skip.has(p.user_id)).slice(0, 5000);
  if (!list.length) return { message: "Nobody in this group can be emailed: they have either opted out or already registered." };

  type O = typeof offering & { venues: { name: string } | null; offering_types: { kind: "course" | "event" } | null };
  const o = offering as O;
  const kind = o.offering_types?.kind ?? "event";
  const url = `${SITE_URL}/${kind === "course" ? "courses" : "events"}/${o.slug}`;
  const poster = o.poster_url ? (o.poster_url.startsWith("http") ? o.poster_url : `${SITE_URL}${o.poster_url}`) : null;
  const when = o.starts_at ? fmtDate(o.starts_at, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) : null;
  const where = o.is_online ? "Online" : o.venues?.name ?? o.location_text;

  const emails = await Promise.all(list.map(async (p) => ({
    to: p.email,
    ...(await renderInviteEmail({ firstName: p.full_name?.split(" ")[0] || "there", title: o.title, subtitle: o.subtitle, speaker: o.speaker, when, where, posterUrl: poster, message, url, logoUrl: emailLogoUrl, kind, subject: subjectIn })),
  })));
  const sent = await sendEmailBatch(emails);

  const { data: campaign } = await supabase.from("campaigns").insert({
    offering_id: o.id, segment_id: segmentId, rules: asJson(rules), subject: emails[0]!.subject, message,
    recipient_count: list.length, sent_count: sent, sent_by: userId,
  }).select("id").single();
  if (campaign) {
    const rows = list.map((p) => ({ campaign_id: campaign.id, user_id: p.user_id, email: p.email }));
    for (let i = 0; i < rows.length; i += 500) await supabase.from("campaign_recipients").insert(rows.slice(i, i + 500));
  }
  revalidatePath("/admin/people");
  if (sent === 0) return { message: `Prepared ${list.length} invites but none were sent. Check RESEND_API_KEY.` };
  return { ok: true, message: `Invite sent to ${sent} ${sent === 1 ? "person" : "people"} for ${o.title}.` };
}
