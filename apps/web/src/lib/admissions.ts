import type { AdmissionStage, GameDetail } from "@hikmah/db";

export const STAGES: { key: AdmissionStage; label: string; short: string }[] = [
  { key: "applied", label: "Applied", short: "Applied" },
  { key: "test_invited", label: "Test sent", short: "Test sent" },
  { key: "test_done", label: "Test done", short: "Test done" },
  { key: "interview_invited", label: "Interview invited", short: "Interview" },
  { key: "interviewed", label: "Interviewed", short: "Interviewed" },
  { key: "selected", label: "Selected", short: "Selected" },
  { key: "waitlisted", label: "Waitlisted", short: "Waitlist" },
  { key: "not_selected", label: "Not selected", short: "Not selected" },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label])) as Record<AdmissionStage, string>;
export const STAGE_PILL: Record<AdmissionStage, string> = {
  applied: "submitted", test_invited: "waitlisted", test_done: "draft", interview_invited: "waitlisted",
  interviewed: "draft", selected: "confirmed", waitlisted: "waitlisted", not_selected: "cancelled",
};

export const GAMES: Record<string, string> = { pattern: "Pattern grid", sequence: "Number sequences", odd: "Odd one out", memory: "Memory flash", logic: "Speed logic" };

/** Test (out of 100) and interview (out of 10) weighted equally once both exist. */
export function combined(test: number | null, interview: number | null) {
  if (test == null) return null;
  if (interview == null) return Number(test);
  return Math.round((Number(test) * 0.5 + Number(interview) * 10 * 0.5) * 10) / 10;
}

export const gameDetail = (d: unknown) => (d && typeof d === "object" ? (d as GameDetail) : {});
