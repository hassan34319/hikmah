import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { safeNext } from "@/lib/safe-next";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function CompleteProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/account");
  if (!supabaseConfigured) redirect("/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/complete-profile");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/sign-in");
  const editing = Boolean(profile.profile_completed_at);

  return (
    <SiteShell>
      <PageBand
        eyebrow={editing ? "Your profile" : "One time setup"}
        title={editing ? "Edit your details" : "Tell us a little about yourself"}
        lead="You fill this once. After that, every course and event form is prefilled for you."
      />
      <section className="hk-section"><div className="hk-container"><div className="hk-narrow hk-panel">
        <ProfileForm profile={profile} next={next} submitLabel={editing ? "Save changes" : "Save and continue"} />
      </div></div></section>
    </SiteShell>
  );
}
