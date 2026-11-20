import Link from "next/link";

export function OfferingCard({ href, tag, title, summary, meta, imageUrl, cta }: {
  href: string; tag: string; title: string; summary?: string | null; meta?: string | null; imageUrl?: string | null; cta?: string;
}) {
  return (
    <Link href={href} className="hk-card">
      <div className="hk-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <span>[Poster]</span>}
      </div>
      <div className="hk-card__body">
        <span className="hk-card__tag">{tag}</span>
        <span className="hk-card__title">{title}</span>
        {summary && <span className="hk-card__summary">{summary}</span>}
        <div className="hk-card__foot">
          {meta && <span className="hk-card__meta">{meta}</span>}
          {cta && <span className="hk-card__cta">{cta} <span aria-hidden="true">→</span></span>}
        </div>
      </div>
    </Link>
  );
}
