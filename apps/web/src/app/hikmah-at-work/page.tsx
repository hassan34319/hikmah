import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { WORK_FAQ, WORK_FORMATS, WORK_STEPS, WORK_THEMES } from "@/lib/programs-content";
import { getSiteSettings } from "@/lib/settings";
import { InviteForm } from "./InviteForm";

export const metadata: Metadata = {
  title: "Hikmah at Work",
  description: "Bring faith-centred talks, workshops and panels on purpose, ethics, leadership and wellbeing to your workplace.",
};

const GALLERY = [1, 3, 5, 2, 4, 6].map((n) => `/work/session-${n}.jpg`);

export const revalidate = 300;

export default async function HikmahAtWorkPage() {
  const { partners } = await getSiteSettings();
  return (
    <SiteShell current="/hikmah-at-work">
      <section className="ab-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/work/session-3.jpg" alt="" className="ab-hero__bg" />
        <div className="ab-hero__shade" />
        <div className="hk-container ab-hero__inner">
          <span className="hm-eyebrow hm-eyebrow--dark">Hikmah at Work · Corporate Outreach</span>
          <h1>Bring meaningful conversations to <span>your workplace.</span></h1>
          <p className="hm-hero__lead">Engaging, thought-provoking sessions that connect faith and timeless Islamic values with the realities of professional and personal life. At your office, for your team.</p>
          <div className="hm-hero__actions">
            <a href="#invite" className="hm-hb hm-hb--accent">Invite Hikmah →</a>
          </div>
          <div className="pg-tags" style={{ marginTop: 4 }}>
            {WORK_FORMATS.filter((f) => f !== "Not sure yet").map((f) => <span key={f} style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)", color: "#fff" }}>{f}</span>)}
          </div>
        </div>
      </section>

      {partners.length > 0 && (
        <section className="hk-container pg-partners">
          <span>Organisations we&apos;ve worked with</span>
          <div>{partners.map((p) => <span key={p}>{p}</span>)}</div>
        </section>
      )}

      <section className="hk-container hm-section">
        <div className="hm-head"><div><span className="hm-eyebrow">Themes</span><h2 className="hm-h2" style={{ marginTop: 10 }}>What we talk about</h2></div></div>
        <div className="pg-cards">
          {WORK_THEMES.map((t) => (
            <div key={t.title} className="pg-card"><h3>{t.title}</h3><ul>{t.items.map((i) => <li key={i}>{i}</li>)}</ul></div>
          ))}
        </div>
      </section>

      <section className="hk-container hm-section">
        <div className="pg-steps">
          <h2 className="hm-h2">How it works</h2>
          <ol>{WORK_STEPS.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol>
        </div>
      </section>

      <section className="hk-container hm-section">
        <div className="hm-head"><h2 className="hm-h2">Recent sessions</h2></div>
        <div className="pg-gallery">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {GALLERY.map((src) => <img key={src} src={src} alt="A Hikmah session at a workplace" loading="lazy" />)}
        </div>
      </section>

      <section className="hk-container hm-section">
        <div className="hm-head"><h2 className="hm-h2">Questions</h2></div>
        <div className="pg-faq">
          {WORK_FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </section>

      <section id="invite" className="hk-container hm-section" style={{ paddingBottom: "clamp(80px, 10vw, 140px)", scrollMarginTop: 80 }}>
        <div className="pg-apply">
          <div>
            <span className="hm-eyebrow">Invite us</span>
            <h2 className="hm-h2" style={{ margin: "10px 0 14px" }}>Request a session</h2>
            <p className="hm-muted">Companies, organisations, universities, NGOs and professional communities can invite Hikmah. Share a few details and our team will get in touch.</p>
          </div>
          <div className="hk-panel"><InviteForm /></div>
        </div>
      </section>
    </SiteShell>
  );
}
