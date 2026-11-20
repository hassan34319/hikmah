export * from "./database.types";

import type { Gender, OccupationType } from "./database.types";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const MAX_INTERESTS = 5;

/** Labels used on the first-time profile form and in admin filters. */
export const OCCUPATION_OPTIONS: { value: OccupationType; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "professional", label: "Working professional" },
  { value: "both", label: "Both" },
  { value: "other", label: "Other" },
];

/** Interest tags offered on the profile form. Used later for targeting. */
export const INTEREST_OPTIONS = [
  "Quran",
  "Hadith",
  "Fiqh",
  "Arabic",
  "Seerah",
  "Tazkiyah",
  "Family and marriage",
  "Youth",
  "Khidmah",
] as const;
