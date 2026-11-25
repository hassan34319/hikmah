"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { safeName } from "@/lib/lms";

export type UploadTicket = { path: string; token: string; name: string; size: number };
const MAX = 50 * 1024 * 1024;

/**
 * Hands out one-time upload links. Storage rules check the caller may write to that folder:
 *   content:    c/<offering>/<subject or none>/...   (teachers of that subject, admins)
 *   submission: s/<assignment>/<own user id>/...       (students who can see the assignment)
 */
export async function prepareUploads(target: { kind: "content"; offeringId: string; subjectId: string | null } | { kind: "submission"; assignmentId: string },
  files: { name: string; size: number }[]): Promise<{ tickets?: UploadTicket[]; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "Please sign in again." };
  if (!files.length) return { tickets: [] };
  if (files.length > 10) return { message: "Up to 10 files at a time." };
  const big = files.find((f) => f.size > MAX);
  if (big) return { message: `${big.name} is larger than 50 MB. Please compress it or share it as a link.` };
  const folder = target.kind === "content"
    ? `c/${target.offeringId}/${target.subjectId ?? "none"}`
    : `s/${target.assignmentId}/${user.id}`;
  const tickets: UploadTicket[] = [];
  for (const f of files) {
    const path = `${folder}/${randomUUID().slice(0, 8)}-${safeName(f.name)}`;
    const { data, error } = await supabase.storage.from("lms").createSignedUploadUrl(path);
    if (error || !data) return { message: error?.message?.includes("row-level security") ? "You can't upload files here." : `Could not prepare the upload: ${error?.message ?? "unknown error"}` };
    tickets.push({ path, token: data.token, name: f.name, size: f.size });
  }
  return { tickets };
}
