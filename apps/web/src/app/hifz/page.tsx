import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { HIFZ } from "@/lib/programs-content";
import { getSiteSettings } from "@/lib/settings";
import { HifzForm } from "./HifzForm";

export const metadata: Metadata = {
  title: "Hifz Program",
  description: "A full-time Hifz program for boys in Karachi that nurtures hearts, not just memorization: daily Hifz, tarbiyah, Seerah, sports and life skills.",
};

export const revalidate = 300;

export default async function HifzPage() {
  const { testimonials: TESTIMONIALS, contact } = await getSiteSettings();
  return (
    <SiteShell current="/courses">
      <section className="ab-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home/courses.jpg" alt="" className="ab-hero__bg" />
        <div className="ab-hero__shade" />
        <div className="hk-container ab-hero__inner">
          <span className="hm-eyebrow hm-eyebrow--dark">Hifz Program 2026</span>
          <h1>More than memorization. <span>Nurturing hearts.</span></h1>
          <p className="hm-hero__lead">A structured, full-time program that combines daily Hifz with character building, Seerah, sports, and technology and life skills, to raise young men shaped by the Quran, not only ones who complete it.</p>
          <div className="pg-facts">
            <div><strong>Who</strong>{HIFZ.ages}</div>
            <div><strong>When</strong>{HIFZ.schedule.map((l) => <div key={l}>{l}</div>)}</div>
            <div><strong>Where</strong>{HIFZ.location}</div>
          </div>
          <div className="hm-hero__actions"><a href="#register" className="hm-hb hm-hb--accent">Register your child →</a></div>
        </div>
      </section>

      <section className="hk-container hm-section">
        <div className="hm-head"><div><span className="hm-eyebrow">What makes it different</span><h2 className="hm-h2" style={{ marginTop: 10 }}>Spiritually grounded, physically active, emotionally balanced</h2></div></div>
        <div className="pg-cards">
          {HIFZ.pillars.map((p) => <div key={p.title} className="pg-card"><h3>{p.title}</h3><p>{p.text}</p></div>)}
        </div>
      </section>

      <section className="hk-container hm-section">
        <div className="pg-steps">
          <h2 className="hm-h2">The learning environment</h2>
          <ol>{HIFZ.environment.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol>
        </div>
      </section>

      <section className="hk-container hm-section">
        <div className="hm-head"><h2 className="hm-h2">What our students say about Hikmah</h2></div>
        <div className="hm-quotes">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="hm-quote">
              <span className="hm-quote__stars" aria-label="5 stars">★★★★★</span>
              <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption><strong>{t.name}</strong><span>{t.role}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="register" className="hk-container hm-section" style={{ paddingBottom: "clamp(80px, 10vw, 140px)", scrollMarginTop: 80 }}>
        <div className="pg-apply">
          <div>
            <span className="hm-eyebrow">Register</span>
            <h2 className="hm-h2" style={{ margin: "10px 0 14px" }}>Register your child</h2>
            <p className="hm-muted">One form for the whole family: add each of your children, then your details. Tracks: Qaida, Nazra, Hifz and Girdaan.</p>
            <p className="hm-muted">Questions? Call or WhatsApp {contact.phone}.</p>
          </div>
          <div className="hk-panel"><HifzForm /></div>
        </div>
      </section>
    </SiteShell>
  );
}
