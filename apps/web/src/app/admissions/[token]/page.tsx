import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBand } from "@hikmah/ui";
import { SiteShell } from "@/components/SiteShell";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/time";
import { BookForm } from "./BookForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admissions", robots: { index: false } };

export default async function AdmissionHub({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: info, error } = await supabase.rpc("admission_test_info", { p_token: token });
  const a = info?.[0];
  if (error || !a) notFound();
  const { data: mine } = await supabase.from("admissions").select("student_id, batch, campus, slot_id, decision_sent_at").eq("test_token", token).maybeSingle();
  const slots = a.stage === "interview_invited" || a.stage === "interviewed" ? ((await supabase.rpc("interview_slots_for", { p_token: token })).data ?? []) : [];
  const booked = slots.find((s) => s.mine);
  const decided = mine?.decision_sent_at && ["selected", "waitlisted", "not_selected"].includes(a.stage);

  const steps = ["Apply", "Admission test", "Interview", "Decision"];
  const at = decided ? 3 : ["interview_invited", "interviewed"].includes(a.stage) ? 2 : ["test_invited", "test_done"].includes(a.stage) ? 1 : 0;

  return (
    <SiteShell>
      <PageBand eyebrow="Admissions" title={a.course} lead={`Assalamu alaikum${a.first_name ? ` ${a.first_name}` : ""}. Here's where your application stands.`} />
      <section className="hk-container adm-wrap">
        <ol className="adm-track">{steps.map((s, i) => <li key={s} data-state={i < at ? "done" : i === at ? "now" : "next"}><span>{i < at ? "✓" : i + 1}</span>{s}</li>)}</ol>

        <div className="adm-card">
          {a.stage === "test_invited" && !a.started && <>
            <h2>Your admission test</h2>
            <p>About 15 minutes of quick puzzles, then a short note on why you want to study at Hikmah.</p>
            <ul className="adm-list">
              <li><b>5 short games:</b> patterns, number sequences, odd one out, memory and logic. They get harder as you go.</li>
              <li><b>Each puzzle has a timer.</b> Answer quickly; faster correct answers earn more points.</li>
              <li><b>One sitting, no going back.</b> Please stay on the test screen; leaving it is noted.</li>
              <li><b>On your own, without AI.</b> There are no trick questions, just do your best.</li>
            </ul>
            <Link href={`/admissions/${token}/test`} className="hk-btn hk-btn--primary">I’m ready, start the test</Link>
          </>}
          {a.stage === "test_invited" && a.started && !a.submitted && <>
            <h2>Continue your test</h2>
            <p>You’ve answered {a.answered} of {a.total}. Pick up where you left off.</p>
            <Link href={`/admissions/${token}/test`} className="hk-btn hk-btn--primary">Continue</Link>
          </>}
          {a.stage === "test_done" && <>
            <h2>Test submitted. JazakAllah khair!</h2>
            <p>Our admissions team is reviewing results. If you’re invited to interview, we’ll email you a link to pick a time.</p>
          </>}
          {(a.stage === "interview_invited" || a.stage === "interviewed") && <>
            <h2>{a.stage === "interviewed" ? "Interview done" : booked ? "Your interview is booked" : "Choose an interview time"}</h2>
            {a.stage === "interviewed" ? <p>JazakAllah khair for coming in. We’ll email you our decision soon, in sha Allah.</p> : <>
              {booked && <p className="adm-booked">{fmtDate(booked.starts_at, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}{booked.venue ? ` · ${booked.venue}` : ""}</p>}
              <p>A short, friendly conversation at campus, about 20 minutes. Please bring your CNIC or B-Form.</p>
              <BookForm token={token} slots={slots.map((s) => ({ slot_id: s.slot_id, day: fmtDate(s.starts_at, { weekday: "long", day: "numeric", month: "long" }), time: fmtDate(s.starts_at, { hour: "numeric", minute: "2-digit" }), venue: s.venue, seats_left: s.seats_left, mine: s.mine }))} />
            </>}
          </>}
          {decided && a.stage === "selected" && <>
            <h2>Welcome to Hikmah! 🎉</h2>
            <p>Alhamdulillah, you’ve been offered a place in {a.course}.</p>
            <div className="adm-id"><small>Your student ID</small><strong>{mine?.student_id}</strong>{(mine?.batch || mine?.campus) && <span>{[mine?.batch, mine?.campus].filter(Boolean).join(" · ")}</span>}</div>
          </>}
          {decided && a.stage === "waitlisted" && <><h2>You’re on the waitlist</h2><p>If a seat opens up we’ll contact you straight away, in sha Allah.</p></>}
          {decided && a.stage === "not_selected" && <><h2>About your application</h2><p>We couldn’t offer you a place in this intake. You’re very welcome at our events and shorter courses, and to apply again next intake.</p><Link href="/events" className="hk-btn hk-btn--ghost">See upcoming events</Link></>}
          {(a.stage === "applied" || (!decided && ["selected", "waitlisted", "not_selected"].includes(a.stage))) && <>
            <h2>Application received</h2><p>Our admissions team is reviewing applications. We’ll email you about the next step.</p>
          </>}
        </div>
      </section>
    </SiteShell>
  );
}
