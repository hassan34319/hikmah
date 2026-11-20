import Link from "next/link";

export interface FooterProps {
  phone: string;
  email: string;
  whatsapp: string;
  campuses: string[];
  socials: { label: string; href: string }[];
  learn: { href: string; label: string }[];
  campusImage?: string;
}

export function Footer({ phone, email, whatsapp, campuses, socials, learn, campusImage }: FooterProps) {
  return (
    <footer className="hk-footer">
      <div className="hk-container hk-footer__inner">
        <div className="hk-footer__cta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={48} height={48} className="hk-footer__logo" />
          <strong>Not sure where to start? Talk to us.</strong>
          <a href={whatsapp} className="hk-pill hk-pill--light" target="_blank" rel="noreferrer">WhatsApp us <span className="hk-pill__arrow">→</span></a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {campusImage && <img src={campusImage} alt="Hikmah campus hall" className="hk-footer__photo" loading="lazy" />}
        </div>
        <div className="hk-footer__cols">
          <div>
            <h3>Learn</h3>
            {learn.map((l) => l.href.startsWith("http")
              ? <a key={l.href} href={l.href}>{l.label}</a>
              : <Link key={l.href} href={l.href}>{l.label}</Link>)}
          </div>
          <div>
            <h3>Campuses</h3>
            {campuses.map((c) => <span key={c}>{c}</span>)}
          </div>
          <div>
            <h3>Contact</h3>
            <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
            <a href={`mailto:${email}`}>{email}</a>
            <span>{socials.map((s, i) => <span key={s.label}>{i > 0 && " · "}<a href={s.href} style={{ display: "inline" }}>{s.label}</a></span>)}</span>
            <Link href="/account">My account</Link>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="hk-footer__wordmark">Hikmah</div>
      <div className="hk-container hk-footer__bottom">© {new Date().getFullYear()} Hikmah Institute. A nonprofit, nonpolitical educational institute.</div>
    </footer>
  );
}
