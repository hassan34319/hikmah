export type FeedbackQuestion = {
  key: string;
  label: string;
  type: "rating" | "single" | "multi" | "text" | "long";
  options?: string[];
  required?: boolean;
};

/** The default form, based on the approved feedback mockup. Admins can edit it per event. */
export const DEFAULT_FEEDBACK: FeedbackQuestion[] = [
  { key: "overall", label: "Overall, how was the session?", type: "rating", required: true },
  { key: "speaker", label: "How was the speaker?", type: "rating", required: true },
  { key: "venue", label: "Venue and timing", type: "rating" },
  { key: "next_topics", label: "What would you like the next session to be about?", type: "multi", options: ["Marriage and family", "Anxiety and tawakkul", "Halal income", "Raising children", "Youth and identity", "Quran and tafsir"] },
  { key: "next_topic_other", label: "Something else?", type: "text" },
  { key: "improve", label: "Anything we can improve?", type: "long" },
  { key: "come_again", label: "Would you come to the next one?", type: "single", options: ["Yes, in sha Allah", "Maybe", "No"] },
];

export function parseQuestions(v: unknown): FeedbackQuestion[] {
  if (!Array.isArray(v)) return [];
  return v.filter((q): q is FeedbackQuestion => !!q && typeof q === "object" && typeof (q as FeedbackQuestion).key === "string" && typeof (q as FeedbackQuestion).label === "string");
}

/** Validates submitted answers against the questions; returns cleaned answers or field errors. */
export function checkAnswers(questions: FeedbackQuestion[], form: FormData) {
  const answers: Record<string, string | number | string[]> = {};
  const errors: Record<string, string> = {};
  for (const q of questions) {
    if (q.type === "rating") {
      const n = Number(form.get(q.key));
      if (Number.isInteger(n) && n >= 1 && n <= 5) answers[q.key] = n;
      else if (q.required) errors[q.key] = "Please choose a rating.";
    } else if (q.type === "multi") {
      const vals = form.getAll(q.key).map(String).filter((x) => q.options?.includes(x));
      if (vals.length) answers[q.key] = vals;
      else if (q.required) errors[q.key] = "Please choose at least one.";
    } else if (q.type === "single") {
      const v = String(form.get(q.key) ?? "");
      if (q.options?.includes(v)) answers[q.key] = v;
      else if (q.required) errors[q.key] = "Please choose one.";
    } else {
      const v = String(form.get(q.key) ?? "").trim().slice(0, q.type === "long" ? 3000 : 300);
      if (v) answers[q.key] = v;
      else if (q.required) errors[q.key] = "Please answer this.";
    }
  }
  return { answers, errors };
}

export const slugKey = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "q";
