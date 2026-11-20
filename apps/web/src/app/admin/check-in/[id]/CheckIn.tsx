"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { lookup, markArrived, type Found } from "./actions";

type Flash = { tone: "ok" | "warn" | "err"; text: string } | null;

// BarcodeDetector is built into Chrome on Android; iPhones fall back to typing the code or name.
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global { interface Window { BarcodeDetector?: new (opts: { formats: string[] }) => Detector } }

export function CheckIn({ offeringId, initialCounts }: { offeringId: string; initialCounts: { expected: number; arrived: number } | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [flash, setFlash] = useState<Flash>(null);
  const [counts, setCounts] = useState(initialCounts);
  const [scanning, setScanning] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const [pending, start] = useTransition();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => { setCanScan(typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator.mediaDevices); }, []);

  const search = (q: string) => start(async () => {
    const res = await lookup(offeringId, q);
    setResults(res.results);
    if (res.error) setFlash({ tone: "err", text: res.error });
    else if (q && res.results.length === 0) setFlash({ tone: "err", text: `No registration found for "${q}".` });
    else setFlash(null);
  });

  const arrive = (r: Found) => start(async () => {
    const res = await markArrived(offeringId, r.registration_id);
    if (!res.ok) { setFlash({ tone: "err", text: res.message }); return; }
    if (res.counts) setCounts(res.counts);
    setFlash(res.already
      ? { tone: "warn", text: `${res.name ?? "This person"} was already checked in.` }
      : { tone: r.status === "waitlisted" ? "warn" : "ok", text: r.status === "waitlisted" ? `${res.name} checked in (was on the waitlist).` : `✓ ${res.name} checked in` });
    setResults((list) => list.map((x) => (x.registration_id === r.registration_id ? { ...x, checked_in_at: new Date().toISOString(), status: "attended" } : x)));
    setQuery("");
  });

  const stopScan = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setScanning(false); };

  const startScan = async () => {
    if (!window.BarcodeDetector) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.current = s;
      setScanning(true);
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = s; void video.current.play(); } });
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!stream.current || !video.current) return;
        try {
          const codes = await detector.detect(video.current);
          const code = codes[0]?.rawValue?.trim();
          if (code) {
            stopScan();
            const res = await lookup(offeringId, code);
            const match = res.results.find((x) => x.ticket_code?.toUpperCase() === code.toUpperCase());
            if (match) arrive(match); else setFlash({ tone: "err", text: `Ticket ${code} is not for this event.` });
            return;
          }
        } catch { /* frame not ready yet */ }
        setTimeout(tick, 250);
      };
      setTimeout(tick, 400);
    } catch {
      setFlash({ tone: "err", text: "Camera not available. Type the ticket code or name instead." });
      stopScan();
    }
  };

  useEffect(() => () => stopScan(), []);

  return (
    <>
      {counts && <div className="ci-count" style={{ padding: "0 16px 14px" }}><span><strong>{counts.arrived}</strong> arrived</span><span><strong>{counts.expected}</strong> expected</span></div>}
      <div className="ci-body">
        <form className="ci-search" onSubmit={(e) => { e.preventDefault(); search(query.trim()); }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ticket code, name or phone" autoComplete="off" enterKeyHint="search" aria-label="Search" />
          {canScan && <button type="button" className="ci-scan" onClick={scanning ? stopScan : startScan}>{scanning ? "Stop" : "Scan"}</button>}
        </form>
        {scanning && <video ref={video} className="ci-video" muted playsInline />}
        {flash && <div className={`ci-flash ci-flash--${flash.tone}`} role="status">{flash.text}</div>}
        {pending && <div className="ad-muted">Working…</div>}
        {results.map((r) => (
          <div key={r.registration_id} className="ci-result">
            <div>
              <strong>{r.full_name ?? "(no name)"}</strong>
              <small>{[r.ticket_code, r.phone, r.status === "waitlisted" ? "On waitlist" : null].filter(Boolean).join(" · ")}</small>
            </div>
            <button className="ci-btn" disabled={!!r.checked_in_at || pending} onClick={() => arrive(r)}>{r.checked_in_at ? "✓ In" : "Check in"}</button>
          </div>
        ))}
        {!scanning && results.length === 0 && !flash && <p className="ad-muted" style={{ margin: 0 }}>{canScan ? "Tap Scan to read a QR ticket, or search by name or phone." : "Search by ticket code, name or phone number."}</p>}
      </div>
    </>
  );
}
