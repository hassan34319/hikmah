"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { keepValuesOnSubmit } from "@/components/PublicForm";
import { decide, inviteInterview, sendDecisions, sendTest, type AdmState } from "./actions";

export type BoardRow = {
  id: string; name: string; phone: string | null; stage: string; stageLabel: string; pill: string;
  test: number | null; flags: string[]; slot: string | null; interview: number | null; combined: number | null; studentId: string | null; sent: boolean; href: string;
};

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="am-step">
      <div className="am-step__head"><span>{n}</span><div><strong>{title}</strong><small>{hint}</small></div></div>
      {children}
    </div>
  );
}

function Msg({ s }: { s: AdmState }) {
  return s.message ? <div className={`ad-alert ${s.ok ? "ad-alert--ok" : "ad-alert--err"}`} style={{ fontSize: 13 }}>{s.message}</div> : null;
}

export function Board({ offeringId, rows, pendingDecisions, campuses, sections }: { offeringId: string; rows: BoardRow[]; pendingDecisions: number; campuses: string[]; sections: { id: string; name: string }[] }) {
  const [sel, setSel] = useState<string[]>([]);
  const [t, tAct, tP] = useActionState<AdmState, FormData>(sendTest, {});
  const [i, iAct, iP] = useActionState<AdmState, FormData>(inviteInterview, {});
  const [c, cAct, cP] = useActionState<AdmState, FormData>(inviteInterview, {});
  const [d, dAct, dP] = useActionState<AdmState, FormData>(decide, {});
  const [n, nAct, nP] = useActionState<AdmState, FormData>(sendDecisions, {});
  const hidden = <><input type="hidden" name="offering_id" value={offeringId} />{sel.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}</>;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const all = rows.length > 0 && sel.length === rows.length;

  return (
    <div className="ad-form__col">
      <section className="am-steps">
        <Step n={1} title="Send the test" hint="Shortlisted applicants get a link by email">
          <form onSubmit={keepValuesOnSubmit(tAct)}>{hidden}<button className="hk-btn hk-btn--primary hk-btn--sm hk-btn--block" disabled={tP || !sel.length}>{tP ? "Sending…" : `Send test to ${sel.length || "ticked"}`}</button></form>
          <Msg s={t} />
        </Step>
        <Step n={2} title="Invite to interview" hint="They book a time from your slots">
          <form onSubmit={keepValuesOnSubmit(iAct)}>{hidden}<button className="hk-btn hk-btn--primary hk-btn--sm hk-btn--block" disabled={iP || !sel.length}>{iP ? "Sending…" : `Invite ${sel.length || "ticked"}`}</button></form>
          <form onSubmit={keepValuesOnSubmit(cAct)} className="am-cut">
            <input type="hidden" name="offering_id" value={offeringId} />
            <span>or everyone scoring</span><input name="cutoff" type="number" min={0} max={100} defaultValue={60} className="ad-input" aria-label="Cut-off score" /><span>+</span>
            <button className="hk-btn hk-btn--ghost hk-btn--sm" disabled={cP}>{cP ? "…" : "Invite"}</button>
          </form>
          <Msg s={i} /><Msg s={c} />
        </Step>
        <Step n={3} title="Decide" hint="Nothing is emailed yet">
          <form onSubmit={keepValuesOnSubmit(dAct)} className="ad-fields" style={{ gap: 6 }}>
            {hidden}
            <select name="decision" className="ad-input" defaultValue="selected" aria-label="Decision">
              <option value="selected">Selected</option><option value="waitlisted">Waitlisted</option><option value="not_selected">Not selected</option>
            </select>
            {sections.length ? (
              <select name="section_id" className="ad-input" defaultValue="" aria-label="Section">
                <option value="">Section (choose for selected)</option>
                {sections.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            ) : (
              <>
                <div className="ad-row" style={{ gap: 6 }}>
                  <input name="batch" className="ad-input" placeholder="Batch (optional)" list="am-batches" />
                  <select name="campus" className="ad-input" defaultValue="" aria-label="Campus"><option value="">Campus</option>{campuses.map((x) => <option key={x}>{x}</option>)}</select>
                </div>
                <datalist id="am-batches"><option>Weekday</option><option>Weekend morning</option><option>Weekend afternoon</option></datalist>
              </>
            )}
            <button className="hk-btn hk-btn--ghost hk-btn--sm hk-btn--block" disabled={dP || !sel.length}>{dP ? "Saving…" : `Mark ${sel.length || "ticked"}`}</button>
          </form>
          <Msg s={d} />
        </Step>
        <Step n={4} title="Send decisions" hint="Selected get a student ID">
          <form onSubmit={keepValuesOnSubmit(nAct)}><input type="hidden" name="offering_id" value={offeringId} />
            <button className="hk-btn hk-btn--primary hk-btn--sm hk-btn--block" disabled={nP || !pendingDecisions}>{nP ? "Sending…" : `Email ${pendingDecisions} decision${pendingDecisions === 1 ? "" : "s"}`}</button>
          </form>
          <Msg s={n} />
        </Step>
      </section>

      <section className="ad-card" style={{ padding: 0 }}>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr>
              <th style={{ width: 36 }}><input type="checkbox" className="ad-check" aria-label="Select all" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} /></th>
              <th>Applicant</th><th>Stage</th><th>Test</th><th>Interview</th><th>Overall</th><th>Student ID</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={sel.includes(r.id) ? { background: "#F4F8FD" } : undefined}>
                  <td><input type="checkbox" className="ad-check" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} /></td>
                  <td><Link href={r.href}>{r.name}</Link><div className="ad-muted">{r.phone}</div></td>
                  <td><span className={`ad-pill ad-pill--${r.pill}`}>{r.stageLabel}</span>{r.sent && <div className="ad-muted">emailed</div>}</td>
                  <td>{r.test != null ? <><strong>{r.test}</strong><span className="ad-muted">/100</span></> : <span className="ad-muted">·</span>}
                    {r.flags.map((f) => <div key={f} className="am-flag">⚠ {f}</div>)}</td>
                  <td>{r.interview != null ? <><strong>{r.interview}</strong><span className="ad-muted">/10</span></> : <span className="ad-muted">{r.slot ?? "·"}</span>}</td>
                  <td>{r.combined != null ? <strong>{r.combined}</strong> : <span className="ad-muted">·</span>}</td>
                  <td className="ad-muted" style={{ fontFamily: "Menlo, monospace", fontSize: 12 }}>{r.studentId ?? ""}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="ad-muted" style={{ padding: 24 }}>Nobody at this stage.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
