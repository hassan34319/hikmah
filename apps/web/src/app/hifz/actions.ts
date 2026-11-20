"use server";

import { HIFZ } from "@/lib/programs-content";
import { normalizePkPhone } from "@/lib/profile-schema";
import { looksLikeBot, submitRequest, type SubmitResult } from "@/lib/requests";

const s = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const validPhone = (v: string) => /^\+?[0-9]{10,15}$/.test(v);
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function registerForHifz(_prev: SubmitResult, form: FormData): Promise<SubmitResult> {
  if (looksLikeBot(form)) return { ok: true };
  const errors: Record<string, string> = {};
  const ids = s(form, "child_ids", 100).split(",").filter((x) => /^\d+$/.test(x)).slice(0, 6);
  if (ids.length === 0) errors.children = "Add at least one child.";

  const children = ids.map((id, n) => {
    const p = (k: string) => s(form, `c${id}_${k}`);
    const c = {
      track: p("track"), name: p("name"), gender: p("gender"), age: p("age"),
      in_school: p("in_school"), school: p("school"), grade: p("grade"),
      prior_study: p("prior_study"), level: p("level"), paras: p("paras"), institute: p("institute"),
    };
    if (!HIFZ.tracks.includes(c.track)) errors[`c${id}_track`] = "Choose a track.";
    if (c.name.length < 2) errors[`c${id}_name`] = "Enter the child's name.";
    const age = Number(c.age);
    if (!Number.isInteger(age) || age < 3 || age > 18) errors[`c${id}_age`] = "Enter an age between 3 and 18.";
    if (c.in_school === "Yes" && !c.school) errors[`c${id}_school`] = "Enter the school name.";
    if (c.prior_study === "Yes" && !c.level) errors[`c${id}_level`] = "Choose the level completed.";
    return { n: n + 1, ...c, school: c.in_school === "Yes" ? c.school : "", level: c.prior_study === "Yes" ? c.level : "", paras: c.prior_study === "Yes" ? c.paras : "", institute: c.prior_study === "Yes" ? c.institute : "" };
  });

  const father = { name: s(form, "father_name", 120), phone: normalizePkPhone(s(form, "father_phone", 30)), email: s(form, "father_email").toLowerCase(), qualification: s(form, "father_qualification"), institution: s(form, "father_institution") };
  const mother = { name: s(form, "mother_name", 120), phone: normalizePkPhone(s(form, "mother_phone", 30)), email: s(form, "mother_email").toLowerCase(), qualification: s(form, "mother_qualification"), institution: s(form, "mother_institution") };
  const address = { address: s(form, "address", 300), area: s(form, "area", 80), city: s(form, "city", 80) || "Karachi", country: s(form, "country", 80) || "Pakistan" };

  if (father.name.length < 2) errors.father_name = "Enter the father's or guardian's name.";
  if (!validPhone(father.phone)) errors.father_phone = "Enter a valid phone number, for example 0300 1234567.";
  if (father.email && !validEmail(father.email)) errors.father_email = "Enter a valid email.";
  if (mother.phone && !validPhone(mother.phone)) errors.mother_phone = "Enter a valid phone number.";
  if (mother.email && !validEmail(mother.email)) errors.mother_email = "Enter a valid email.";
  if (address.address.length < 5) errors.address = "Enter your home address.";
  if (address.area.length < 2) errors.area = "Enter your area.";
  if (Object.keys(errors).length) return { errors, message: "Please check the highlighted fields." };

  const yes = (v: string) => v || "-";
  return submitRequest({
    kind: "hifz",
    name: father.name,
    email: father.email || mother.email || null,
    phone: father.phone,
    payload: { children, father, mother, address },
    sections: [
      ...children.map((c) => ({
        title: `Child ${c.n}: ${c.name}`,
        rows: [["Track", c.track], ["Gender", yes(c.gender)], ["Age", c.age], ["In school or college", yes(c.in_school)], ["School", yes(c.school)], ["Grade / class", yes(c.grade)],
          ["Studied Quran before", yes(c.prior_study)], ["Level completed", yes(c.level)], ["Paras memorized", yes(c.paras)], ["Institute / madrassah", yes(c.institute)]] as [string, string][],
      })),
      { title: "Father / guardian", rows: [["Name", father.name], ["Phone", father.phone], ["Email", yes(father.email)], ["Qualification", yes(father.qualification)], ["School / university", yes(father.institution)]] },
      { title: "Mother / guardian", rows: [["Name", yes(mother.name)], ["Phone", yes(mother.phone)], ["Email", yes(mother.email)], ["Qualification", yes(mother.qualification)], ["School / university", yes(mother.institution)]] },
      { title: "Address", rows: [["Address", address.address], ["Area", address.area], ["City", address.city], ["Country", address.country]] },
    ],
  });
}
