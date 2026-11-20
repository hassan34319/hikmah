import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { WeekCarousel, type WeekItem } from "@/components/WeekCarousel";
import { listOfferings, type OfferingWithType } from "@/lib/offerings";
import { RIBBON, STATS, TALKS, TESTIMONIALS } from "@/lib/site-content";

export const dynamic = "force-dynamic";

const TZ = "Asia/Karachi";
const dayShort = (iso: string) => new Intl.DateTimeFormat("en-PK", { weekday: "short", timeZone: TZ }).format(new Date(iso)).toUpperCase();
const dayNum = (iso: string) => new Intl.DateTimeFormat("en-PK", { day: "numeric", timeZone: TZ }).format(new Date(iso));
const time = (iso: string) => new Intl.DateTimeFormat("en-PK", { hour: "numeric", minute: "2-digit", timeZone: TZ }).format(new Date(iso));

/** "THIS FRIDAY" when within 7 days, otherwise "NEXT UP". */
function whenLabel(iso: string) {
  const days = (new Date(iso).getTime() - Date.now()) / 86_400_000;
  const weekday = new Intl.DateTimeFormat("en-PK", { weekday: "long", timeZone: TZ }).format(new Date(iso)).toUpperCase();
  return days < 1 ? "TODAY" : days < 7 ? `THIS ${weekday}` : "NEXT UP";
}

function venueName(o: OfferingWithType) {
  return o.is_online ? "Online" : o.venues?.name ?? o.location_text ?? "";
}

const TINTS = ["#F1F4F9", "#E6EEF8", "#EDF2F8"];
const initials = (name: string) => name.replace(/^(Dr|Mufti|Maulana|Shaykh)\.?\s+/i, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default async function HomePage() {
  const [courses, allEvents] = await Promise.all([listOfferings("course"), listOfferings("event")]);
  const now = Date.now();
  const events = allEvents
    .filter((e) => e.starts_at && new Date(e.ends_at ?? e.starts_at).getTime() > now)
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime());
  const featured = events[0];
  const flagship = courses.find((c) => c.pinned) ?? courses[0];
  const otherCourses = courses.filter((c) => c.id !== flagship?.id);

  const week: WeekItem[] = events.slice(0, 8).map((e, i) => ({
    href: `/events/${e.slug}`,
    day: dayShort(e.starts_at!),
    title: e.title,
    meta: [e.subtitle ?? e.offering_types?.name, e.speaker, time(e.starts_at!)].filter(Boolean).join(" · "),
    image: e.poster_url,
    tint: TINTS[i % TINTS.length]!,
  }));

  return (
    <SiteShell current="/" overlayHeader>
      {/* Hero */}
      <section className="hm-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home/hero.jpg" alt="A full hall listening to a talk at a Hikmah event" className="hm-hero__bg" />
        <div className="hm-hero__shade" />
        <div className="hm-hero__fade" />
        <svg aria-hidden="true" viewBox="0 0 200 200" className="hm-hero__pattern"><g fill="none" stroke="#FFFFFF" strokeWidth="0.8"><rect x="40" y="40" width="120" height="120" /><rect x="40" y="40" width="120" height="120" transform="rotate(45 100 100)" /><circle cx="100" cy="100" r="60" /><circle cx="100" cy="100" r="85" /><rect x="65" y="65" width="70" height="70" /><rect x="65" y="65" width="70" height="70" transform="rotate(45 100 100)" /></g></svg>

        <div className="hk-container hm-hero__inner">
          <div className="hm-hero__copy">
            <span className="hm-eyebrow hm-eyebrow--dark">Ilm · Dawah · Islah · Khidmah</span>
            <h1 className="hm-hero__title">Rediscover your deen, with <span>Hikmah.</span></h1>
            <div className="hm-ayah">
              <span lang="ar" dir="rtl" className="hm-ayah__ar">ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ <span>بِالْحِكْمَةِ</span></span>
              <span className="hm-ayah__en">&ldquo;Invite to the way of your Lord with wisdom.&rdquo; <small>Surah An-Nahl, 16:125</small></span>
            </div>
            <p className="hm-hero__lead">Classical Islamic scholarship, taught for students and working professionals in Karachi. Evenings and weekends, at our Sindhi Muslim Society and DHA campuses.</p>
            <div className="hm-hero__actions">
              <Link href="/courses" className="hm-hb hm-hb--accent">Explore courses →</Link>
              <Link href="/events" className="hm-hb hm-hb--outline">Attend an event</Link>
            </div>
          </div>
        </div>

        {featured?.starts_at && (
          <Link href={`/events/${featured.slug}`} className="hm-next">
            <div className="hm-next__date"><span>{dayShort(featured.starts_at)}</span><strong>{dayNum(featured.starts_at)}</strong></div>
            <div className="hm-next__text">
              <span className="hm-next__label">{whenLabel(featured.starts_at)}</span>
              <strong>{featured.title}</strong>
              <span>{[featured.speaker, venueName(featured) || time(featured.starts_at)].filter(Boolean).join(" · ")}</span>
            </div>
            <span aria-hidden="true" className="hm-next__arrow">→</span>
          </Link>
        )}
      </section>

      {/* Stats */}
      <section className="hm-stats">
        <div className="hk-container hm-stats__grid">
          {STATS.map((s) => <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>)}
        </div>
      </section>

      {/* This week */}
      {week.length > 0 && <section className="hm-section"><WeekCarousel items={week} /></section>}

      {/* Flagship course */}
      {flagship && (
        <section className="hk-container hm-section">
          <div className="hm-split">
            <div className="hm-split__body">
              <span className="hm-eyebrow">Our flagship course · {flagship.subtitle}</span>
              <h2 className="hm-h2">{flagship.title}, built for working adults</h2>
              <p className="hm-muted">{flagship.summary}</p>
              <div className="hm-facts">
                <div><strong>{flagship.subtitle?.split(" ")[0]}</strong><span>years</span></div>
                <div><strong>3</strong><span>batches to choose from</span></div>
                <div><strong>2</strong><span>campuses</span></div>
              </div>
              <Link href={`/courses/${flagship.slug}`} className="hk-pill hk-pill--dark">Apply now <span className="hk-pill__arrow">→</span></Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/darse-nizami.jpg" alt={`${flagship.title} students in class`} className="hm-split__img" loading="lazy" />
          </div>
        </section>
      )}

      {/* Ribbon */}
      <section className="hm-ribbon" aria-label="Highlights">
        <div className="hm-ribbon__track">
          {[...RIBBON, ...RIBBON].map((r, i) => <span key={i} aria-hidden={i >= RIBBON.length}>{r} <em>✦</em></span>)}
        </div>
      </section>

      {/* More courses */}
      {otherCourses.length > 0 && (
        <section className="hk-container" style={{ paddingTop: 44 }}>
          <div className="hm-split">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/courses.jpg" alt="A class in session at Hikmah" className="hm-split__img" loading="lazy" />
            <div className="hm-split__body">
              <span className="hm-eyebrow">More ways to learn</span>
              <h2 className="hm-h2">A course for every stage of life</h2>
              <div className="hm-list">
                {otherCourses.map((c) => (
                  <Link key={c.id} href={`/courses/${c.slug}`}>
                    <span><strong>{c.title}</strong><span className="hm-muted"> · {c.subtitle}</span></span><span aria-hidden="true">→</span>
                  </Link>
                ))}
                <Link href="/hifz"><span><strong>Hifz Program</strong><span className="hm-muted"> · boys, full time</span></span><span aria-hidden="true">→</span></Link>
              </div>
              <Link href="/courses" className="hk-pill hk-pill--dark">View all courses <span className="hk-pill__arrow">→</span></Link>
            </div>
          </div>
        </section>
      )}

      {/* Community */}
      <section className="hk-container hm-section hm-community">
        <h2 className="hm-h2" style={{ textAlign: "center" }}>A community built on<br />knowledge and khidmah</h2>
        <div className="hm-stack">
          <div className="hm-stack__a" /><div className="hm-stack__b" />
          <div className="hm-stack__card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/community.jpg" alt="Young attendees at a Hikmah talk" loading="lazy" />
            <div className="hm-stack__stats">
              {[STATS[0]!, STATS[1]!, STATS[3]!].map((s) => <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="hm-section">
        <div className="hk-container hm-head"><h2 className="hm-h2">What our students<br />say about Hikmah</h2></div>
        <div className="hk-container hm-quotes">
          {TESTIMONIALS.map((t, i) => (
            <figure key={t.name} className="hm-quote">
              <span className="hm-quote__stars" aria-label="5 stars">★★★★★</span>
              <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
              <div className="hm-quote__ini" style={{ background: TINTS[i % TINTS.length] }}>{initials(t.name)}</div>
              <figcaption><strong>{t.name}</strong><span>{t.role}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Talks */}
      <section className="hk-container hm-section hm-talks-wrap">
        <h2 className="hm-h2" style={{ textAlign: "center" }}>Recent talks to<br />watch this week</h2>
        <div className="hm-talks">
          {TALKS.map((t, i) => (
            <a key={t.id} href={`https://www.youtube.com/watch?v=${t.id}`} target="_blank" rel="noreferrer" className="hm-talk" style={{ background: TINTS[i % TINTS.length] }}>
              <span className="hm-talk__tag">▶ {t.series} · Video</span>
              <strong>{t.title}</strong>
              <span className="hm-muted" style={{ fontSize: 14 }}>{t.speaker}</span>
              <div className="hm-talk__thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`} alt="" loading="lazy" />
                <span aria-hidden="true">▶</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
