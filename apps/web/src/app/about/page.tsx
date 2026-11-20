import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { getSiteSettings } from "@/lib/settings";
import { BOARD, COFOUNDERS, CONTACT, PATRON, PILLARS } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "About us",
  description: "Hikmah Institute is a nonprofit, nonpolitical educational institute in Karachi, spreading the teachings of Islam through Ilm, Dawah, Islah and Khidmah.",
};

export const revalidate = 300;

export default async function AboutPage() {
  const { stats: STATS, testimonials: TESTIMONIALS, contact } = await getSiteSettings();
  return (
    <SiteShell current="/about">
      {/* Hero */}
      <section className="ab-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home/darse-nizami.jpg" alt="" className="ab-hero__bg" />
        <div className="ab-hero__shade" />
        <div className="hk-container ab-hero__inner">
          <span className="hm-eyebrow hm-eyebrow--dark">About Hikmah Institute</span>
          <h1>Bringing you authentic Islamic knowledge to navigate <span>contemporary challenges.</span></h1>
          <div className="hm-ayah">
            <span lang="ar" dir="rtl" className="hm-ayah__ar">ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ <span>بِالْحِكْمَةِ</span> وَالْمَوْعِظَةِ الْحَسَنَةِ</span>
            <span className="hm-ayah__en">&ldquo;Invite to the way of your Lord with wisdom and kind advice, and reason with them in the best manner.&rdquo; <small>Surah An-Nahl, 16:125</small></span>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="hk-container ab-mission">
        <div>
          <span className="hm-eyebrow">Who we are</span>
          <h2 className="hm-h2">A nonprofit, nonpolitical home for Islamic learning</h2>
        </div>
        <div className="ab-mission__text">
          <p>Hikmah Institute is a nonprofit and nonpolitical educational institute dedicated to the propagation of the divine teachings of Islam, to bring about positive change in our society through Ilm, Dawah, Islah and Khidmah.</p>
          <p>Our mission is to instill love for Islam in the hearts of men, so they can recover their Islamic identity and draw closer to the Deen for success in this world and the next. We aim to produce people who excel in both Deen and Dunya, and who become catalysts for positive change.</p>
          <div className="ab-mini-stats">
            {STATS.map((s) => <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>)}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="ab-pillars-wrap">
        <div className="hk-container">
          <div className="hm-head"><h2 className="hm-h2">Our four pillars</h2></div>
          <div className="ab-pillars">
            {PILLARS.map((p, i) => (
              <div key={p.name} className="ab-pillar">
                <span className="ab-pillar__num">0{i + 1}</span>
                <span lang="ar" dir="rtl" className="ab-pillar__ar">{p.ar}</span>
                <h3>{p.name}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Patron */}
      <section className="hk-container hm-section">
        <div className="ab-patron">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PATRON.photo} alt="" />
          <div>
            <span className="hm-eyebrow">Our {PATRON.role.toLowerCase()}</span>
            <h2 className="hm-h2">{PATRON.name} <span className="ab-db">DB</span></h2>
            {PATRON.bio.map((p) => <p key={p}>{p}</p>)}
          </div>
        </div>
      </section>

      {/* Co-founders */}
      <section className="hk-container hm-section">
        <div className="hm-head"><h2 className="hm-h2">Co-founders</h2></div>
        <div className="ab-people ab-people--3">
          {COFOUNDERS.map((p) => (
            <figure key={p.name} className="ab-person">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo} alt={p.name} loading="lazy" />
              <figcaption><strong>{p.name}</strong><span>{p.bio}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Board */}
      <section className="hk-container hm-section">
        <div className="hm-head"><h2 className="hm-h2">Board members</h2></div>
        <div className="ab-people">
          {BOARD.map((p) => (
            <figure key={p.name} className="ab-person ab-person--sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo} alt="" loading="lazy" />
              <figcaption><strong>{p.name}</strong><span>{p.bio}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="hk-container hm-section">
        <div className="hm-head"><h2 className="hm-h2">In our students&apos; words</h2></div>
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

      {/* Visit */}
      <section className="hk-container hm-section" style={{ paddingBottom: "clamp(80px, 10vw, 140px)" }}>
        <div className="ab-visit">
          <div>
            <span className="hm-eyebrow hm-eyebrow--dark">Visit us</span>
            <h2>Two campuses in Karachi</h2>
            <p>Classes run on weeknights and weekends. Drop by, or message us and we&apos;ll help you find the right course.</p>
            <div className="hm-hero__actions">
              <a href={contact.whatsapp} target="_blank" rel="noreferrer" className="hm-hb hm-hb--accent">WhatsApp us →</a>
              <Link href="/courses" className="hm-hb hm-hb--outline">Explore courses</Link>
            </div>
          </div>
          <div className="ab-campuses">
            <div><strong>Main Campus</strong><span>{CONTACT.campuses[0]}, Karachi</span><a href="https://maps.app.goo.gl/p6NVEjvU899cKguW6" target="_blank" rel="noreferrer">Get directions →</a></div>
            <div><strong>DHA Campus</strong><span>{CONTACT.campuses[1]}, Karachi</span><a href="https://maps.app.goo.gl/CoFGGhRfKWkHJ88Q7" target="_blank" rel="noreferrer">Get directions →</a></div>
            <div><strong>Contact</strong><span>{contact.phone}</span><span>{contact.email}</span></div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
