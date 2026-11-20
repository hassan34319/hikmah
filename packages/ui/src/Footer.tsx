import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="hk-footer">
      <div className="hk-container hk-footer__inner">
        <div>
          <h3>Hikmah Institute</h3>
          <p style={{ margin: 0, maxWidth: 360 }}>Authentic Islamic knowledge for contemporary challenges. Karachi, Pakistan.</p>
        </div>
        <div>
          <h3>Learn</h3>
          <Link href="/courses">Courses</Link>
          <Link href="/events">Events</Link>
        </div>
        <div>
          <h3>Account</h3>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/account">My registrations</Link>
        </div>
      </div>
      <div className="hk-container hk-footer__bottom">© {year} Hikmah Institute</div>
    </footer>
  );
}
