import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Player } from "./Player";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admission test", robots: { index: false } };

export default async function TestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admission_test_info", { p_token: token });
  const a = data?.[0];
  if (error || !a) notFound();
  if (a.stage !== "test_invited" || a.submitted) redirect(`/admissions/${token}`);
  return <Player token={token} course={a.course} essayPrompt={a.essay_prompt} firstName={a.first_name ?? ""} answered={a.answered} total={a.total} />;
}
