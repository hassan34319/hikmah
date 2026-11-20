"use client";

import Link from "next/link";
import { useRef } from "react";

export type WeekItem = { href: string; day: string; title: string; meta: string; image: string | null; tint: string };

export function WeekCarousel({ items }: { items: WeekItem[] }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * 310, behavior: "smooth" });
  return (
    <>
      <div className="hk-container hm-head">
        <h2 className="hm-h2">This week<br />at Hikmah</h2>
        <div className="hm-head__actions">
          <Link href="/events" className="hm-link">All events</Link>
          <button type="button" className="hm-circle" aria-label="Previous" onClick={() => scroll(-1)}>←</button>
          <button type="button" className="hm-circle hm-circle--dark" aria-label="Next" onClick={() => scroll(1)}>→</button>
        </div>
      </div>
      <div className="hk-container">
        <div className="hm-track" ref={track}>
          {items.map((e) => (
            <Link key={e.href} href={e.href} className="hm-ev" style={{ background: e.tint }}>
              <span className="hm-ev__day">{e.day}</span>
              <div>
                <strong className="hm-ev__title">{e.title}</strong>
                <div className="hm-ev__meta">{e.meta}</div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {e.image && <img src={e.image} alt="" loading="lazy" />}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
