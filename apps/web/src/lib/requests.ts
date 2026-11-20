import "server-only";
import { renderRequestEmails } from "@hikmah/emails";
import type { Json, RequestKind } from "@hikmah/db";
import { emailLogoUrl, sendEmail } from "./email";
import { SITE_URL, supabaseConfigured } from "./env";
import { createClient } from "./supabase/server";

/** Who gets told about new requests. PLACEHOLDER: confirm the inbox with the team. */
const NOTIFY_TO = (process.env.REQUESTS_NOTIFY_EMAIL || "info@hikmahinstitute.org.pk").split(",").map((s) => s.trim()).filter(Boolean);

export const KIND_LABEL: Record<RequestKind, string> = {
  mentorship: "Mentorship Circle",
  corporate: "Hikmah at Work",
  hifz: "Hifz Program",
  contact: "Contact",
};

const NEXT_STEP: Record<RequestKind, string> = {
  mentorship: "Our team will match you with a suitable mentor and get in touch to book your first conversation, in sha Allah.",
  corporate: "Our team will contact you to understand your audience and agree on a topic, format and date.",
  hifz: "Our team will contact you about the next steps, including an assessment and a campus visit.",
  contact: "Our team will get back to you soon.",
};

export type SubmitResult = { ok?: boolean; message?: string; errors?: Record<string, string> };

/** Bots fill hidden fields and submit instantly; people do neither. */
export function looksLikeBot(form: FormData) {
  if (String(form.get("website") ?? "").trim()) return true;
  const started = Number(form.get("started_at") ?? 0);
  return !started || Date.now() - started < 2500;
}

export async function submitRequest(args: {
  kind: RequestKind; name: string; email: string | null; phone: string | null; payload: Record<string, unknown>;
  sections: { title?: string; rows: [string, string][] }[];
}): Promise<SubmitResult> {
  if (!supabaseConfigured) return { message: "The website is not connected yet." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("submit_request", {
    p_kind: args.kind, p_name: args.name, p_email: args.email, p_phone: args.phone, p_payload: args.payload as Json,
  });
  if (error || !id) {
    if (error?.message.includes("too_many")) return { message: "We've already received several requests from you in the last hour. Our team will be in touch." };
    if (error?.message.includes("bad_email")) return { errors: { email: "Enter a valid email." }, message: "Please check the highlighted fields." };
    console.error("submit_request", error?.message);
    return { message: "Something went wrong. Please try again, or message us on WhatsApp." };
  }

  const emails = await renderRequestEmails({
    kindLabel: KIND_LABEL[args.kind], name: args.name, sections: args.sections,
    adminUrl: `${SITE_URL}/admin/requests?kind=${args.kind}&r=${id}`, logoUrl: emailLogoUrl, next: NEXT_STEP[args.kind],
  });
  await Promise.all([
    ...NOTIFY_TO.map((to) => sendEmail({ to, ...emails.notification })),
    args.email ? sendEmail({ to: args.email, ...emails.receipt }) : Promise.resolve(),
  ]);
  return { ok: true };
}
