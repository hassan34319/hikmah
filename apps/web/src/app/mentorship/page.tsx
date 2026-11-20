import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { MENTORS, MENTORSHIP_AREAS, MENTORSHIP_STEPS } from "@/lib/programs-content";
import { MentorshipForm } from "./MentorshipForm";

export const metadata: Metadata = {
  title: "Mentorship Circle",
  description: "One-to-one, faith-centred guidance from experienced mentors at Hikmah Institute, Karachi.",
};

export default function MentorshipPage() {
  return (
    <SiteShell current="/mentorship">
      <section className="ab-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/work/mentorship.jpg" alt="" className="ab-hero__bg" />
        <div className="ab-hero__shade" />
        <div className="hk-container ab-hero__inner">
          <span className="hm-eyebrow hm-eyebrow--dark">Mentorship Circle</span>
          <h1>You don&apos;t have to navigate life <span>alone.</span></h1>
          <p className="hm-hero__lead">A one-to-one guidance programme that pairs you with an experienced mentor for meaningful conversations, practical advice and faith-centred support.</p>
          <div className="hm-ayah">
            <span lang="ar" dir="rtl" className="hm-ayah__ar">فَاسْأَلُوا <span>أَهْلَ الذِّكْرِ</span> إِن كُنتُمْ لَا تَعْلَمُونَ</span>
            <span className="hm-ayah__en">&ldquo;And ask the people of knowledge if you do not know.&rdquo; <small>Surah An-Nahl, 16:43</small></span>
          </div>
          <div className="hm-hero__actions"><a href="#apply" className="hm-hb hm-hb--accent">Apply for mentorship →</a></div>
        </div>
      </section>

      <section className="hk-container hm-section">
        <div className="hm-head"><div><span className="hm-eyebrow">Areas of mentorship</span><h2 className="hm-h2" style={{ marginTop: 10 }}>Whatever you&apos;re going through</h2></div></div>
        <div className="pg-cards">
          {MENTORSHIP_AREAS.map((g) => (
            <div key={g.group} className="pg-card">
              <h3>{g.group}</h3>
              <div className="pg-tags">{g.items.map((i) => <span key={i}>{i}</span>)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="hk-container hm-section">
        <div className="pg-steps">
          <h2 className="hm-h2">How it works</h2>
          <ol>{MENTORSHIP_STEPS.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol>
        </div>
      </section>

      <section className="hk-container hm-section">
        <div className="hm-head"><h2 className="hm-h2">Our mentors</h2></div>
        <div className="ab-people">
          {MENTORS.map((m) => (
            <figure key={m.name} className="ab-person">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.photo} alt={m.name} loading="lazy" />
              <figcaption><strong>{m.name}</strong><span>{m.role}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="apply" className="hk-container hm-section" style={{ paddingBottom: "clamp(80px, 10vw, 140px)", scrollMarginTop: 80 }}>
        <div className="pg-apply">
          <div>
            <span className="hm-eyebrow">Apply</span>
            <h2 className="hm-h2" style={{ margin: "10px 0 14px" }}>Request a mentor</h2>
            <p className="hm-muted">Tell us a little about yourself and the area you&apos;d like guidance in. Everything you share stays confidential with our mentorship team.</p>
          </div>
          <div className="hk-panel"><MentorshipForm /></div>
        </div>
      </section>
    </SiteShell>
  );
}
