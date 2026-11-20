import Link from "next/link";

export function OfferingCard({ href, tag, title, summary, meta, imageUrl }: {
  href: string; tag: string; title: string; summary?: string | null; meta?: string | null; imageUrl?: string | null;
}) {
  return (
    <Link href={href} className="hk-card">
      <div className="hk-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? <img src={imageUrl} alt="" /> : <span>[Poster]</span>}
      </div>
      <div className="hk-card__body">
        <span className="hk-card__tag">{tag}</span>
        <span className="hk-card__title">{title}</span>
        {summary && <span style={{ color: "var(--hk-muted)", fontSize: 15 }}>{summary}</span>}
        {meta && <span className="hk-card__meta">{meta}</span>}
      </div>
    </Link>
  );
}
