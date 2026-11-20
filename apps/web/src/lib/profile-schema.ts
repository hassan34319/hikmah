import { z } from "zod";
import { INTEREST_OPTIONS } from "@hikmah/db";

/** Turns 0300 1234567, 3001234567 or +92 300 1234567 into +923001234567. */
export function normalizePkPhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;
  if (/^3\d{9}$/.test(digits)) return `+92${digits}`;
  if (/^92\d{10}$/.test(digits)) return `+${digits}`;
  return digits;
}

const optional = z.string().trim().max(200).transform((v) => v || null);
const phone = z.string().trim().transform(normalizePkPhone)
  .refine((v) => /^\+?[0-9]{10,15}$/.test(v), "Enter a valid phone number, for example 0300 1234567.");

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name.").max(120),
  phone,
  whatsapp_same: z.boolean(),
  whatsapp: z.string().trim().transform((v) => (v ? normalizePkPhone(v) : null)),
  date_of_birth: z.string().trim().refine((v) => {
    const d = new Date(v);
    const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    return !Number.isNaN(d.getTime()) && age > 5 && age < 110;
  }, "Please enter your date of birth."),
  occupation_type: z.enum(["student", "professional", "both", "other"], { message: "Please choose one." }),
  university: optional,
  degree: optional,
  year_of_study: optional,
  company: optional,
  job_title: optional,
  address_line: optional,
  area: z.string().trim().min(2, "Please enter your area, for example Gulshan or DHA.").max(80),
  city: z.string().trim().min(2, "Please enter your city.").max(80),
  interests: z.array(z.enum(INTEREST_OPTIONS)).default([]),
  heard_from: optional,
  email_opt_in: z.boolean(),
  whatsapp_opt_in: z.boolean(),
}).superRefine((v, ctx) => {
  const studying = v.occupation_type === "student" || v.occupation_type === "both";
  const working = v.occupation_type === "professional" || v.occupation_type === "both";
  if (studying && !v.university) ctx.addIssue({ code: "custom", path: ["university"], message: "Please enter your university or college." });
  if (working && !v.company) ctx.addIssue({ code: "custom", path: ["company"], message: "Please enter where you work." });
  if (!v.whatsapp_same && v.whatsapp && !/^\+?[0-9]{10,15}$/.test(v.whatsapp)) {
    ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "Enter a valid WhatsApp number." });
  }
});

export type ProfileInput = z.input<typeof profileSchema>;

export function profileFromForm(form: FormData) {
  const s = (k: string) => String(form.get(k) ?? "");
  return {
    full_name: s("full_name"),
    phone: s("phone"),
    whatsapp_same: form.get("whatsapp_same") === "on",
    whatsapp: s("whatsapp"),
    date_of_birth: s("date_of_birth"),
    occupation_type: s("occupation_type"),
    university: s("university"),
    degree: s("degree"),
    year_of_study: s("year_of_study"),
    company: s("company"),
    job_title: s("job_title"),
    address_line: s("address_line"),
    area: s("area"),
    city: s("city") || "Karachi",
    interests: form.getAll("interests").map(String),
    heard_from: s("heard_from"),
    email_opt_in: form.get("email_opt_in") === "on",
    whatsapp_opt_in: form.get("whatsapp_opt_in") === "on",
  };
}
