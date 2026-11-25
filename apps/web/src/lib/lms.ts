import type { Json, LmsFile, LmsLink } from "@hikmah/db";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Karachi week order for timetables: Monday first, Sunday last. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "18:30:00" -> "6:30 pm" */
export function fmtTime(t: string) {
  const [h = 0, m = 0] = t.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export function asFiles(v: Json | null | undefined): LmsFile[] {
  return Array.isArray(v) ? (v as unknown as LmsFile[]).filter((f) => f && typeof f.path === "string") : [];
}
export function asLinks(v: Json | null | undefined): LmsLink[] {
  return Array.isArray(v) ? (v as unknown as LmsLink[]).filter((l) => l && typeof l.url === "string") : [];
}

export function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Safe storage file name: keeps letters, numbers, dots and dashes. */
export function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 60) || "file";
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^\w]/g, "").slice(0, 8) : "";
  return ext ? `${base}.${ext}` : base;
}

/** Link to download a file through the access-checked route. */
export function fileHref(f: LmsFile) {
  return `/learn/file?p=${encodeURIComponent(f.path)}&n=${encodeURIComponent(f.name)}`;
}

export function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "PDF";
  if (["ppt", "pptx", "key", "odp"].includes(ext)) return "Slides";
  if (["doc", "docx", "odt", "rtf", "txt"].includes(ext)) return "Doc";
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "Sheet";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return "Image";
  if (["mp3", "m4a", "wav", "ogg"].includes(ext)) return "Audio";
  if (["mp4", "mov", "webm", "mkv"].includes(ext)) return "Video";
  return ext.toUpperCase() || "File";
}

/** Due-date wording relative to now. */
export function dueLabel(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const h = Math.round(Math.abs(ms) / 3_600_000);
  if (ms < 0) return h < 24 ? `${h || 1} h overdue` : `${Math.round(h / 24)} d overdue`;
  if (h < 1) return "due within the hour";
  if (h < 24) return `due in ${h} h`;
  return `due in ${Math.round(h / 24)} d`;
}

export const ERR: Record<string, string> = {
  not_allowed: "You don't have access to do that.",
  no_section: "That section no longer exists.",
  past_due: "The due date has passed and late work isn't accepted for this one.",
  marks_above_max: "Marks can't be more than the total for this assignment.",
  closed: "This quiz isn't open right now.",
  submitted: "You've already submitted this quiz.",
  time_up: "Time is up for this quiz.",
  points_out_of_range: "Points must be between 0 and the question's total.",
};
export function errText(message: string) {
  return ERR[message] ?? message;
}
