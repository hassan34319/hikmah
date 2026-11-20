import { z } from "zod";
import { INTEREST_OPTIONS, MAX_INTERESTS } from "@hikmah/db";

/** Turns 0300 1234567, 3001234567 or +92 300 1234567 into +923001234567. */
export function normalizePkPhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;
  if (/^3\d{9}$/.test(digits)) return `+92${digits}`;
  if (/^92\d{10}$/.test(digits)) return `+${digits}`;
  return digits;
}

/** Turns 4210112345671 or 42101-1234567-1 into 42101-1234567-1. Returns "" for blank. */
export function normalizeCnic(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length !== 13) return raw.trim();
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

const optional = z.string().trim().max(200).transform((v) => v || null);

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name.").max(120),
  gender: z.enum(["male", "female"], { message: "Please choose one." }),
  cnic: z.string().transform(normalizeCnic)
    .refine((v) => v === "" || /^\d{5}-\d{7}-\d$/.test(v), "CNIC or B-Form has 13 digits, for example 42101-1234567-1.")
    .transform((v) => v || null),
  phone: z.string().trim().transform(normalizePkPhone)
    .refine((v) => /^\+?[0-9]{10,15}$/.test(v), "Enter a valid WhatsApp number, for example 0300 1234567."),
  date_of_birth: z.string().trim().refine((v) => {
    const d = new Date(v);
    const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    return !Number.isNaN(d.getTime()) && age > 5 && age < 110;
  }, "Please enter your date of birth."),
  occupation_type: z.enum(["student", "professional", "both", "other"], { message: "Please choose one." }),
  university: optional,
  degree: optional,
  education_year: optional,
  company: optional,
  job_title: optional,
  address_line: optional,
  area: z.string().trim().min(2, "Please enter your area, for example Gulshan or DHA.").max(80),
  interests: z.array(z.enum(INTEREST_OPTIONS)).max(MAX_INTERESTS, `Pick up to ${MAX_INTERESTS} interests.`).default([]),
  heard_from: optional,
  email_opt_in: z.boolean(),
  whatsapp_opt_in: z.boolean(),
}).superRefine((v, ctx) => {
  const studying = v.occupation_type === "student" || v.occupation_type === "both";
  const working = v.occupation_type === "professional" || v.occupation_type === "both";
  if (studying && !v.university) ctx.addIssue({ code: "custom", path: ["university"], message: "Please enter your university or college." });
  if (working && !v.company) ctx.addIssue({ code: "custom", path: ["company"], message: "Please enter where you work." });
});

export function profileFromForm(form: FormData) {
  const s = (k: string) => String(form.get(k) ?? "");
  return {
    full_name: s("full_name"),
    gender: s("gender"),
    cnic: s("cnic"),
    phone: s("phone"),
    date_of_birth: s("date_of_birth"),
    occupation_type: s("occupation_type"),
    university: s("university"),
    degree: s("degree"),
    education_year: s("education_year"),
    company: s("company"),
    job_title: s("job_title"),
    address_line: s("address_line"),
    area: s("area"),
    interests: form.getAll("interests").map(String),
    heard_from: s("heard_from"),
    email_opt_in: form.get("email_opt_in") === "on",
    whatsapp_opt_in: form.get("whatsapp_opt_in") === "on",
  };
}
