"use server";

import { z } from "zod";
import { BATCH_OPTIONS, COURSE_OPTIONS, ENROLLMENT_OPTIONS, MENTORSHIP_AREAS } from "@/lib/programs-content";
import { normalizePkPhone } from "@/lib/profile-schema";
import { looksLikeBot, submitRequest, type SubmitResult } from "@/lib/requests";

const AREAS = [...MENTORSHIP_AREAS.flatMap((g) => g.items), "Others"];
const pick = (list: string[], msg = "Please choose one.") => z.string().refine((v) => list.includes(v), msg);

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name.").max(120),
  gender: pick(["Male", "Female"]),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter your date of birth."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().transform(normalizePkPhone).refine((v) => /^\+?[0-9]{10,15}$/.test(v), "Enter a valid phone number."),
  area: pick(AREAS),
  area_other: z.string().trim().max(120),
  course: pick(COURSE_OPTIONS),
  course_other: z.string().trim().max(120),
  batch: pick(BATCH_OPTIONS),
  enrollment: pick(ENROLLMENT_OPTIONS),
}).superRefine((v, ctx) => {
  if (v.area === "Others" && !v.area_other) ctx.addIssue({ code: "custom", path: ["area_other"], message: "Tell us the area." });
  if (v.course === "Others" && !v.course_other) ctx.addIssue({ code: "custom", path: ["course_other"], message: "Tell us the course." });
});

export async function applyForMentorship(_prev: SubmitResult, form: FormData): Promise<SubmitResult> {
  if (looksLikeBot(form)) return { ok: true };
  const raw = Object.fromEntries(["full_name", "gender", "date_of_birth", "email", "phone", "area", "area_other", "course", "course_other", "batch", "enrollment"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors, message: "Please check the highlighted fields." };
  }
  const v = parsed.data;
  const area = v.area === "Others" ? v.area_other : v.area;
  const course = v.course === "Others" ? v.course_other : v.course;
  return submitRequest({
    kind: "mentorship", name: v.full_name, email: v.email, phone: v.phone,
    payload: { gender: v.gender, date_of_birth: v.date_of_birth, area, course, batch: v.batch, enrollment: v.enrollment },
    sections: [{ rows: [["Name", v.full_name], ["Gender", v.gender], ["Date of birth", v.date_of_birth], ["Email", v.email], ["Phone", v.phone], ["Area of mentorship", area], ["Course", course], ["Batch", v.batch], ["Enrollment", v.enrollment]] }],
  });
}
