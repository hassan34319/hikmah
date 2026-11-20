import type { Metadata } from "next";
import { PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { supabaseConfigured } from "@/lib/env";
import { parseQuestions } from "@/lib/feedback";
import { publicClient } from "@/lib/supabase/public";
import { fmtDate } from "@/lib/time";
import { FeedbackForm } from "./FeedbackForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Feedback", robots: { index: false } };

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[0-9a-f-]{36}$/i.test(token) && supabaseConfigured;
  const { data } = valid ? await publicClient().rpc("feedback_form_for", { p_token: token }) : { data: null };
  const f = data?.[0];

  if (!f) {
    return (
      <SiteShell>
        <PageBand eyebrow="Feedback" title="This link isn't working" lead="The feedback link may be incomplete. Please open it again from your email." />
      </SiteShell>
    );
  }
  const when = f.starts_at ? fmtDate(f.starts_at, { weekday: "long", day: "numeric", month: "long" }) : null;
  return (
    <SiteShell>
      <PageBand eyebrow="Thank you for coming" title={`How was ${f.offering_title}?`}
        lead={[f.first_name ? `Assalamu alaikum ${f.first_name}.` : null, [f.venue, when].filter(Boolean).join(" · "), "Takes about a minute."].filter(Boolean).join(" ")} />
      <section className="hk-section">
        <div className="hk-container">
          <div className="hk-narrow hk-panel">
            {f.intro && <p style={{ marginTop: 0 }}>{f.intro}</p>}
            {f.is_open
              ? <FeedbackForm token={token} questions={parseQuestions(f.questions)} previous={(f.answers as Record<string, unknown> | null) ?? null} anonymous={!!f.anonymous} />
              : <p style={{ margin: 0 }}>Feedback for this event is now closed. JazakAllah khair for coming.</p>}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
