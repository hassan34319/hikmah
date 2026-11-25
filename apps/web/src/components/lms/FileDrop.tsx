"use client";

import { createClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";
import type { LmsFile } from "@hikmah/db";
import { prepareUploads } from "@/app/learn/upload";
import { fileIcon, fmtSize } from "@/lib/lms";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
let client: ReturnType<typeof createClient> | null = null;
const storage = () => (client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })).storage.from("lms");

type Target = Parameters<typeof prepareUploads>[0];

/** Uploads straight to storage and keeps the list in a hidden "files" input as JSON. */
export function FileDrop({ target, initial = [], name = "files", label = "Files", hint = "Slides, PDFs, documents, images or audio. Up to 50 MB each." }: {
  target: Target; initial?: LmsFile[]; name?: string; label?: string; hint?: string;
}) {
  const [files, setFiles] = useState<LmsFile[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setErr(null);
    const picked = Array.from(list);
    setBusy(`Uploading ${picked.length === 1 ? picked[0]!.name : `${picked.length} files`}…`);
    try {
      const res = await prepareUploads(target, picked.map((f) => ({ name: f.name, size: f.size })));
      if (!res.tickets) { setErr(res.message ?? "Upload failed."); return; }
      const done: LmsFile[] = [];
      for (const [i, t] of res.tickets.entries()) {
        setBusy(`Uploading ${t.name} (${i + 1} of ${res.tickets.length})…`);
        const { error } = await storage().uploadToSignedUrl(t.path, t.token, picked[i]!, { contentType: picked[i]!.type || undefined });
        if (error) { setErr(`${t.name}: ${error.message}`); break; }
        done.push({ path: t.path, name: t.name, size: t.size });
      }
      setFiles((f) => [...f, ...done]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="lm-drop">
      <span className="ad-label" style={{ marginBottom: 6 }}>{label}</span>
      <input type="hidden" name={name} value={JSON.stringify(files)} />
      {files.length > 0 && (
        <ul className="lm-files">
          {files.map((f) => (
            <li key={f.path}>
              <span className="lm-ficon">{fileIcon(f.name)}</span>
              <span className="lm-fname">{f.name}</span>
              <span className="ad-muted">{fmtSize(f.size)}</span>
              <button type="button" className="lm-x" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.path !== f.path))}>✕</button>
            </li>
          ))}
        </ul>
      )}
      <label className={`lm-drop__zone${busy ? " is-busy" : ""}`}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("is-over"); }}
        onDragLeave={(e) => e.currentTarget.classList.remove("is-over")}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("is-over"); void add(e.dataTransfer.files); }}>
        <input ref={input} type="file" multiple disabled={!!busy} onChange={(e) => void add(e.target.files)} />
        <strong>{busy ?? "Drop files here or tap to choose"}</strong>
        {!busy && <small>{hint}</small>}
      </label>
      {err && <div className="ad-alert ad-alert--err" role="alert">{err}</div>}
    </div>
  );
}
