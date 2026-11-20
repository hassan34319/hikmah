import type { ReactNode } from "react";

export function PageBand({ eyebrow, title, lead, actions, hero }: {
  eyebrow?: string; title: ReactNode; lead?: ReactNode; actions?: ReactNode; hero?: boolean;
}) {
  return (
    <section className={`hk-band ${hero ? "hk-band--hero" : "hk-band--page"}`}>
      <div className="hk-container">
        <div className="hk-band__inner">
          {eyebrow && <span className="hk-band__eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {lead && <p className="hk-band__lead">{lead}</p>}
          {actions && <div className="hk-band__actions">{actions}</div>}
        </div>
      </div>
    </section>
  );
}
