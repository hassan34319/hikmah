import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ProfileRow } from "@hikmah/db";
import { ButtonLink, PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { supabaseConfigured } from "@/lib/env";
import { displayProfileValue, toFieldDefs } from "@/lib/forms";
import { formatEventDate } from "@/lib/offerings";
import { offeringWhere } from "@/lib/registration";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!supabaseConfigured) redirect("/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/register/${slug}`);

  const [{ data: profile }, { data: offering }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("offerings")
      .select("id, slug, title, subtitle, status, capacity, starts_at, ends_at, is_online, location_text, registration_closes_at, offering_types(kind, name), venues(name, address, map_url), form_fields(position, required, label_override, help_override, fields(key, label, type, options, help_text, placeholder, profile_column))")
      .eq("slug", slug).maybeSingle(),
  ]);
  if (!offering || !profile) notFound();

  type O = typeof offering & {
    offering_types: { kind: "course" | "event"; name: string } | null;
    venues: { name: string; address: string | null; map_url: string | null } | null;
    form_fields: Parameters<typeof toFieldDefs>[0];
  };
  const o = offering as unknown as O;
  const isCourse = o.offering_types?.kind === "course";
  const back = isCourse ? `/courses/${slug}` : `/events/${slug}`;

  const { data: existing } = await supabase.from("registrations")
    .select("id, status").eq("offering_id", o.id).eq("user_id", user.id).neq("status", "cancelled").maybeSingle();

  const defs = toFieldDefs(o.form_fields);
  const fromProfile = defs.filter((d) => d.profileColumn);
  const questions = defs.filter((d) => !d.profileColumn);

  let seatsLeft: number | null = null;
  if (!isCourse && o.capacity) {
    const { data: taken } = await supabase.rpc("seats_taken", { p_offering_id: o.id });
    seatsLeft = Math.max(0, o.capacity - (taken ?? 0));
  }
  const closed = o.status !== "published"
    || (o.registration_closes_at && new Date(o.registration_closes_at) < new Date())
    || (o.ends_at && new Date(o.ends_at) < new Date());

  const when = formatEventDate(o.starts_at);
  const where = offeringWhere(o);
  const lead = isCourse ? `${o.subtitle ?? ""} course application` : [when, where].filter(Boolean).join(" · ");

  return (
    <SiteShell>
      <PageBand eyebrow={isCourse ? "Apply" : "Register"} title={o.title} lead={lead} />
      <section className="hk-section">
        <div className="hk-container">
          <div className="hk-narrow" style={{ display: "grid", gap: 20 }}>
            {existing ? (
              <div className="hk-panel" style={{ display: "grid", gap: 12 }}>
                <h2 style={{ fontSize: 20 }}>You&apos;re already {isCourse ? "applied" : "registered"}</h2>
                <ButtonLink href={`/account/registrations/${existing.id}`}>{isCourse ? "View my application" : "View my registration"}</ButtonLink>
              </div>
            ) : closed ? (
              <div className="hk-panel" style={{ display: "grid", gap: 12 }}>
                <h2 style={{ fontSize: 20 }}>Registration is closed</h2>
                <ButtonLink href={back} variant="ghost">Back</ButtonLink>
              </div>
            ) : (
              <>
                {seatsLeft !== null && (
                  <div className={`hk-alert ${seatsLeft === 0 ? "hk-alert--error" : "hk-alert--info"}`}>
                    {seatsLeft === 0 ? "This event is full. You can still register and we'll add you to the waitlist." : `${seatsLeft} seats left.`}
                  </div>
                )}
                <div className="hk-panel" style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: 18 }}>Your details</h2>
                    <Link href={`/complete-profile?next=/register/${slug}`} style={{ fontWeight: 600, fontSize: 14 }}>Edit</Link>
                  </div>
                  <dl style={{ margin: 0, display: "grid", gap: 8 }}>
                    {fromProfile.map((d) => (
                      <div key={d.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 15 }}>
                        <dt style={{ color: "var(--hk-muted)" }}>{d.label}</dt>
                        <dd style={{ margin: 0, fontWeight: 500, textAlign: "right" }}>
                          {displayProfileValue(d.profileColumn as keyof ProfileRow, profile[d.profileColumn as keyof ProfileRow])
                            ?? <span style={{ color: "var(--hk-danger)" }}>Missing</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <span className="hk-field__hint">Filled in from your account.</span>
                </div>
                <div className="hk-panel">
                  {questions.length > 0 && <h2 style={{ fontSize: 18, marginBottom: 16 }}>{isCourse ? "A few questions" : "Just a few more questions"}</h2>}
                  <RegisterForm
                    slug={slug}
                    questions={questions}
                    submitLabel={isCourse ? "Submit application" : seatsLeft === 0 ? "Join the waitlist" : "Confirm registration"}
                    note={isCourse ? "We'll email you when your application is reviewed." : "You'll get a confirmation email with the venue details."}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
