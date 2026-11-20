import type { FieldType, ProfileRow } from "@hikmah/db";

export type FormFieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  help: string | null;
  placeholder: string | null;
  required: boolean;
  /** Set when the answer comes from the person's profile instead of an input. */
  profileColumn: keyof ProfileRow | null;
};

type RawFormField = {
  position: number; required: boolean; label_override: string | null; help_override: string | null;
  fields: { key: string; label: string; type: FieldType; options: unknown; help_text: string | null; placeholder: string | null; profile_column: string | null } | null;
};

export function toFieldDefs(raw: RawFormField[]): FormFieldDef[] {
  return [...raw]
    .sort((a, b) => a.position - b.position)
    .filter((f) => f.fields)
    .map((f) => ({
      key: f.fields!.key,
      label: f.label_override ?? f.fields!.label,
      type: f.fields!.type,
      options: Array.isArray(f.fields!.options) ? (f.fields!.options as unknown[]).map(String) : [],
      help: f.help_override ?? f.fields!.help_text,
      placeholder: f.fields!.placeholder,
      required: f.required,
      profileColumn: (f.fields!.profile_column as keyof ProfileRow | null) ?? null,
    }));
}

/** Human labels for stored profile values. */
export function displayProfileValue(col: keyof ProfileRow, value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (col === "occupation_type") return ({ student: "Student", professional: "Working professional", both: "Student and professional", other: "Other" } as Record<string, string>)[String(value)] ?? String(value);
  if (col === "gender") return String(value) === "male" ? "Male" : "Female";
  if (col === "date_of_birth") return new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(String(value)));
  return Array.isArray(value) ? value.join(", ") : String(value);
}

/**
 * Builds the answers object from submitted form data. Profile-backed fields are copied from the
 * profile (a snapshot at registration time); everything else is validated against its definition.
 */
export function collectAnswers(defs: FormFieldDef[], form: FormData, profile: ProfileRow) {
  const answers: Record<string, string | string[] | boolean | null> = {};
  const errors: Record<string, string> = {};

  for (const d of defs) {
    if (d.profileColumn) {
      const v = profile[d.profileColumn];
      answers[d.key] = Array.isArray(v) ? v.map(String) : v === null || v === undefined ? null : String(v);
      if (d.required && (v === null || v === "")) errors[d.key] = `${d.label} is missing from your profile. Please edit your details.`;
      continue;
    }

    if (d.type === "multi_select") {
      const vals = form.getAll(d.key).map(String).filter((v) => d.options.includes(v));
      answers[d.key] = vals;
      if (d.required && vals.length === 0) errors[d.key] = "Please choose at least one.";
      continue;
    }
    if (d.type === "checkbox") {
      const checked = form.get(d.key) === "on";
      answers[d.key] = checked;
      if (d.required && !checked) errors[d.key] = "Please tick this box to continue.";
      continue;
    }

    const raw = String(form.get(d.key) ?? "").trim().slice(0, 5000);
    answers[d.key] = raw || null;
    if (!raw) {
      if (d.required) errors[d.key] = "This is required.";
      continue;
    }
    if (d.type === "single_select" && !d.options.includes(raw)) errors[d.key] = "Please choose one of the options.";
    if (d.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) errors[d.key] = "Enter a valid email.";
    if (d.type === "number" && Number.isNaN(Number(raw))) errors[d.key] = "Enter a number.";
    if (d.type === "url" && !/^https?:\/\//.test(raw)) errors[d.key] = "Enter a full link starting with https://";
    if (d.type === "phone" && !/^\+?[0-9 -]{10,16}$/.test(raw)) errors[d.key] = "Enter a valid phone number.";
  }
  return { answers, errors };
}
