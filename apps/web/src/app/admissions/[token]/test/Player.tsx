"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Json, TestItem } from "@hikmah/db";
import { answerItem, flagLeave, nextItem, startTest, submitTest } from "../actions";
import { Figure, type Fig } from "./Shapes";

// Game order is fixed: pattern x6, sequence x6, odd x6, memory x5, logic x8 (positions 1 to 31).
const ORDER: { game: string; first: number; title: string; how: string; icon: string }[] = [
  { game: "pattern", first: 1, title: "Pattern grid", how: "Each row and column follows a rule. Pick the piece that completes the grid. Watch the shape, the count, the colour fill and where the little hand points.", icon: "▦" },
  { game: "sequence", first: 7, title: "Number sequences", how: "Find the rule and pick the number that comes next.", icon: "∑" },
  { game: "odd", first: 13, title: "Odd one out", how: "Four figures share a rule. Tap the one that doesn't fit.", icon: "◇" },
  { game: "memory", first: 19, title: "Memory flash", how: "Tiles light up one by one. When they stop, tap them back in the same order. Each round is longer.", icon: "✦" },
  { game: "logic", first: 24, title: "Speed logic", how: "Made-up words, real logic. Read the statements and answer Yes, No or Can't tell. Be quick!", icon: "⚡" },
];
const firstOf = (pos: number) => ORDER.find((g) => g.first === pos);
const gameOf = (pos: number) => [...ORDER].reverse().find((g) => pos >= g.first)!;

type Phase = "starting" | "intro" | "loading" | "play" | "essay" | "done" | "error";

export function Player({ token, course, essayPrompt, firstName, answered, total }: { token: string; course: string; essayPrompt: string; firstName: string; answered: number; total: number }) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [pos, setPos] = useState(answered + 1);
  const [count, setCount] = useState(total || 31);
  const [item, setItem] = useState<TestItem | null>(null);
  const [score, setScore] = useState(0);
  const [pop, setPop] = useState<{ ok: boolean; pts: number } | null>(null);
  const [left, setLeft] = useState(0);
  const [warn, setWarn] = useState(false);
  const [err, setErr] = useState("");
  const busy = useRef(false);

  const load = useCallback(async () => {
    setPhase("loading");
    const r = await nextItem(token);
    if (r.error) { setErr(r.error); setPhase("error"); return; }
    if (!r.item) { setPhase("essay"); return; }
    setItem(r.item); setCount(r.item.total); setScore(r.item.score); setPos(r.item.pos);
    setPhase("play");
  }, [token]);

  const goNext = useCallback((nextPos: number) => {
    if (nextPos > count) { setPhase("essay"); return; }
    if (firstOf(nextPos)) { setPos(nextPos); setPhase("intro"); } else void load();
  }, [count, load]);

  useEffect(() => {
    (async () => {
      const s = await startTest(token);
      if (s.error) { setErr(s.error); setPhase("error"); return; }
      if (answered >= (total || 31) && total) { setPhase("essay"); return; }
      if (firstOf(answered + 1) || answered === 0) setPhase("intro"); else void load();
    })();
  }, [token, answered, total, load]);

  // Leaving the tab is recorded (once per leave) and gently flagged.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden" && (phase === "play" || phase === "intro")) { void flagLeave(token); setWarn(true); } };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase, token]);

  const submit = useCallback(async (response: Json) => {
    if (!item || busy.current) return;
    busy.current = true;
    const r = await answerItem(token, item.item_id, response);
    setScore((s) => s + (r.points ?? 0));
    setPop({ ok: r.correct, pts: r.points ?? 0 });
    setTimeout(() => { setPop(null); busy.current = false; goNext(item.pos + 1); }, 650);
  }, [item, token, goNext]);

  const intro = gameOf(pos);
  return (
    <div className="tp" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
      <header className="tp-top">
        <div><span className="tp-brand">Hikmah admission test</span><strong>{course}</strong></div>
        {phase !== "essay" && phase !== "done" && <div className="tp-stats"><span>{Math.min(pos, count)}<small>/{count}</small></span><span className="tp-pts">{score}<small> pts</small></span></div>}
      </header>
      {phase !== "essay" && phase !== "done" && <div className="tp-progress"><span style={{ width: `${(100 * (pos - 1)) / count}%` }} /></div>}
      {warn && <div className="tp-warn" onClick={() => setWarn(false)}>Please stay on this screen until you finish. Leaving the test is noted for the admissions team. ✕</div>}

      <main className="tp-stage">
        {phase === "starting" || phase === "loading" ? <div className="tp-spin" aria-label="Loading" /> : null}
        {phase === "error" && <div className="tp-card"><h2>Something went wrong</h2><p>{err}</p><Link href={`/admissions/${token}`} className="hk-btn hk-btn--primary">Back</Link></div>}

        {phase === "intro" && (
          <div className="tp-card tp-intro">
            <div className="tp-icon">{intro.icon}</div>
            <span className="tp-eyebrow">Game {ORDER.indexOf(intro) + 1} of {ORDER.length}</span>
            <h2>{intro.title}</h2>
            <p>{intro.how}</p>
            {pos === 1 && <p className="tp-muted">{firstName ? `Bismillah, ${firstName}. ` : "Bismillah. "}Faster correct answers earn more points.</p>}
            <button className="hk-btn hk-btn--primary" onClick={() => void load()}>{pos === 1 ? "Start" : "Go"}</button>
          </div>
        )}

        {phase === "play" && item && (
          <Game key={item.item_id} item={item} onAnswer={submit} setLeft={setLeft} />
        )}
        {phase === "play" && item && <Timer limit={item.limit_s} left={left} />}
        {pop && <div className={`tp-pop ${pop.ok ? "is-ok" : "is-no"}`}>{pop.ok ? `+${pop.pts}` : "✗"}</div>}

        {phase === "essay" && <Essay token={token} prompt={essayPrompt} onDone={() => setPhase("done")} />}
        {phase === "done" && (
          <div className="tp-card tp-intro">
            <div className="tp-icon">✓</div>
            <h2>Test complete. JazakAllah khair!</h2>
            <p>Our admissions team will review your results and email you about the next step, in sha Allah.</p>
            <Link href={`/admissions/${token}`} className="hk-btn hk-btn--primary">Back to my application</Link>
          </div>
        )}
      </main>
    </div>
  );
}

function Timer({ limit, left }: { limit: number; left: number }) {
  return <div className="tp-timer"><div className="tp-timer__bar"><span style={{ width: `${Math.max(0, (100 * left) / limit)}%` }} className={left <= 5 ? "is-low" : undefined} /></div><span>{Math.ceil(Math.max(0, left))}s</span></div>;
}

/** Counts down from the item's limit; calls onEnd once. */
function useCountdown(limit: number, running: boolean, setLeft: (n: number) => void, onEnd: () => void) {
  const ended = useRef(false);
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    setLeft(limit);
    const t = setInterval(() => {
      const l = limit - (Date.now() - start) / 1000;
      setLeft(l);
      if (l <= 0 && !ended.current) { ended.current = true; clearInterval(t); onEnd(); }
    }, 100);
    return () => clearInterval(t);
  }, [limit, running]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Game({ item, onAnswer, setLeft }: { item: TestItem; onAnswer: (r: Json) => void; setLeft: (n: number) => void }) {
  const p = item.payload as Record<string, unknown>;
  const [chosen, setChosen] = useState<number | null>(null);
  const choose = (i: number) => { if (chosen !== null) return; setChosen(i); onAnswer(i); };
  useCountdown(item.limit_s, item.game !== "memory", setLeft, () => { if (chosen === null) { setChosen(-1); onAnswer(null); } });
  const level = <span className="tp-level">Level {item.level}</span>;

  if (item.game === "pattern") {
    const cells = p.cells as (Fig | null)[]; const options = p.options as Fig[];
    return (
      <div className="tp-card tp-wide">{level}
        <h3>Which piece completes the grid?</h3>
        <div className="tp-grid3">{cells.map((c, i) => <div key={i} className={c ? "tp-cell" : "tp-cell is-missing"}>{c ? <Figure fig={c} /> : "?"}</div>)}</div>
        <div className="tp-opts tp-opts--figs">{options.map((o, i) => <button key={i} className={chosen === i ? "is-picked" : ""} onClick={() => choose(i)}><Figure fig={o} size={64} /></button>)}</div>
      </div>
    );
  }
  if (item.game === "sequence") {
    const terms = p.terms as number[]; const options = p.options as number[];
    return (
      <div className="tp-card">{level}
        <h3>What comes next?</h3>
        <div className="tp-seq">{terms.map((t, i) => <span key={i}>{t}</span>)}<span className="is-missing">?</span></div>
        <div className="tp-opts">{options.map((o, i) => <button key={i} className={chosen === i ? "is-picked" : ""} onClick={() => choose(i)}>{o}</button>)}</div>
      </div>
    );
  }
  if (item.game === "odd") {
    const items = p.items as Fig[];
    return (
      <div className="tp-card tp-wide">{level}
        <h3>Tap the odd one out</h3>
        <div className="tp-opts tp-opts--figs tp-odd">{items.map((o, i) => <button key={i} className={chosen === i ? "is-picked" : ""} onClick={() => choose(i)}><Figure fig={o} size={84} /></button>)}</div>
      </div>
    );
  }
  if (item.game === "logic") {
    const options = p.options as string[];
    return (
      <div className="tp-card"><span className="tp-level">Quick logic</span>
        <h3 className="tp-logic">{String(p.question)}</h3>
        <div className="tp-opts tp-opts--3">{options.map((o, i) => <button key={i} className={chosen === i ? "is-picked" : ""} onClick={() => choose(i)}>{o}</button>)}</div>
      </div>
    );
  }
  return <Memory item={item} onAnswer={onAnswer} setLeft={setLeft} />;
}

function Memory({ item, onAnswer, setLeft }: { item: TestItem; onAnswer: (r: Json) => void; setLeft: (n: number) => void }) {
  const p = item.payload as { size: number; sequence: number[]; flash_ms: number };
  const [lit, setLit] = useState<number | null>(null);
  const [watching, setWatching] = useState(true);
  const [taps, setTaps] = useState<number[]>([]);
  const sent = useRef(false);
  useEffect(() => { setLeft(item.limit_s); }, [item.limit_s, setLeft]);
  useEffect(() => {
    let i = 0; let off = false;
    const t = setInterval(() => {
      if (off) { setLit(null); off = false; return; }
      if (i >= p.sequence.length) { clearInterval(t); setLit(null); setWatching(false); return; }
      setLit(p.sequence[i]!); i++; off = true;
    }, p.flash_ms / 2);
    return () => clearInterval(t);
  }, [p.sequence, p.flash_ms]);
  const finish = (r: number[] | null) => { if (sent.current) return; sent.current = true; onAnswer(r); };
  useCountdown(item.limit_s, !watching, setLeft, () => finish(taps.length ? taps : null));
  const tap = (i: number) => {
    if (watching || sent.current) return;
    const next = [...taps, i]; setTaps(next); setLit(i); setTimeout(() => setLit(null), 180);
    if (next.length === p.sequence.length) finish(next);
  };
  return (
    <div className="tp-card"><span className="tp-level">Round {item.level} · {p.sequence.length} tiles</span>
      <h3>{watching ? "Watch closely…" : `Your turn: tap ${p.sequence.length - taps.length} more`}</h3>
      <div className="tp-mem" style={{ gridTemplateColumns: `repeat(${p.size}, 1fr)` }}>
        {Array.from({ length: p.size * p.size }, (_, i) => <button key={i} aria-label={`Tile ${i + 1}`} className={lit === i ? "is-lit" : ""} onClick={() => tap(i)} disabled={watching} />)}
      </div>
    </div>
  );
}

function Essay({ token, prompt, onDone }: { token: string; prompt: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [pledge, setPledge] = useState(false);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const send = async () => {
    setSending(true); setErr("");
    const r = await submitTest(token, text, pledge);
    setSending(false);
    if (r.error) setErr(r.error); else onDone();
  };
  return (
    <div className="tp-card tp-essay">
      <span className="tp-eyebrow">Last step</span>
      <h2>{prompt}</h2>
      <p className="tp-muted">In your own words, about 80 to 200 words. There are no right answers: we want to know you.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} onPaste={(e) => e.preventDefault()} rows={9} placeholder="Write here…" />
      <div className="tp-muted" style={{ textAlign: "right" }}>{words} words</div>
      <label className="tp-pledge"><input type="checkbox" checked={pledge} onChange={(e) => setPledge(e.target.checked)} /> I wrote this myself, without AI tools or anyone else’s help.</label>
      {err && <div className="hk-alert hk-alert--error">{err}</div>}
      <button className="hk-btn hk-btn--primary" disabled={sending || !pledge || words < 8} onClick={() => void send()}>{sending ? "Submitting…" : "Submit my test"}</button>
    </div>
  );
}
