"use server";

import { z } from "zod";
import { WORK_FORMATS } from "@/lib/programs-content";
import { normalizePkPhone } from "@/lib/profile-schema";
import { looksLikeBot, submitRequest, type SubmitResult } from "@/lib/requests";

const schema = z.object({
  format: z.string().refine((v) => WORK_FORMATS.includes(v), "Please choose a format."),
  organisation: z.string().trim().min(2, "Enter your organisation's name.").max(160),
  preferred_date: z.string().trim().max(40),
  preferred_time: z.string().trim().max(40),
  topic: z.string().trim().max(500),
  name: z.string().trim().min(2, "Enter your name.").max(120),
  designation: z.string().trim().max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().transform(normalizePkPhone).refine((v) => /^\+?[0-9]{10,15}$/.test(v), "Enter a valid phone or WhatsApp number."),
});

export async function inviteHikmah(_prev: SubmitResult, form: FormData): Promise<SubmitResult> {
  if (looksLikeBot(form)) return { ok: true };
  const raw = Object.fromEntries(["format", "organisation", "preferred_date", "preferred_time", "topic", "name", "designation", "email", "phone"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors, message: "Please check the highlighted fields." };
  }
  const v = parsed.data;
  return submitRequest({
    kind: "corporate", name: v.name, email: v.email, phone: v.phone,
    payload: { organisation: v.organisation, designation: v.designation, format: v.format, preferred_date: v.preferred_date, preferred_time: v.preferred_time, topic: v.topic },
    sections: [{ rows: [["Organisation", v.organisation], ["Session format", v.format], ["Preferred date", v.preferred_date], ["Preferred time", v.preferred_time], ["Preferred topic", v.topic], ["Contact person", v.name], ["Designation", v.designation], ["Email", v.email], ["Phone / WhatsApp", v.phone]] }],
  });
}
