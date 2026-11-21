#!/usr/bin/env python3
"""Narrated tutorial editor.

    python3 edit.py out/student.webm

Turns a raw recording and its marks file into a short, voiced 1080p tutorial:
  * every step is as long as its spoken line; typing and page loads are squeezed to fit
  * a camera follows the cursor, zooming in on what is being clicked and pulling back on page changes
  * compact captions, branded intro and outro cards
Writes out/final/<name>.mp4 and one clip per chapter (out/final/<name>-NN-<chapter>.mp4).

Needs ffmpeg, Python Playwright (graphics) and kokoro-onnx (voice; set KOKORO_DIR to the model folder).
"""
import argparse, base64, json, os, re, shutil, subprocess, sys
from pathlib import Path

OW, OH, FPS = 1920, 1080, 30
HERE = Path(__file__).resolve().parent
LOGO = HERE.parents[1] / "apps/web/public/logo.png"
KOKORO_DIR = Path(os.environ.get("KOKORO_DIR", "/home/claude/tts"))
VOICE = os.environ.get("VOICE", "am_michael")
VOICE_SPEED = float(os.environ.get("VOICE_SPEED", "1.05"))
ZOOM_IN = float(os.environ.get("ZOOM_IN", "1.22"))
EASE = 0.7  # seconds for each camera move
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-r", str(FPS)]
AENC = ["-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2"]


def run(cmd):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-4000:])
        raise SystemExit("ffmpeg failed")
    return r.stdout


def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).strip())


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40]


# ---------------- voice ----------------

class Voice:
    def __init__(self, work):
        from kokoro_onnx import Kokoro
        self.k = Kokoro(str(KOKORO_DIR / "kokoro-v1.0.onnx"), str(KOKORO_DIR / "voices-v1.0.bin"))
        self.work = work; self.n = 0

    def say(self, text):
        import soundfile as sf
        self.n += 1
        out = self.work / f"vo{self.n:03d}.wav"
        samples, sr = self.k.create(text, voice=VOICE, speed=VOICE_SPEED, lang="en-us")
        sf.write(out, samples, sr)
        return out, len(samples) / sr


# ---------------- graphics ----------------

CSS = """
*{margin:0;box-sizing:border-box} html,body{width:1920px;height:1080px;background:transparent;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.cap{position:absolute;left:50%;transform:translateX(-50%);bottom:44px;max-width:1500px;text-align:center;
  background:rgba(11,27,51,.92);border-radius:20px;padding:16px 34px 18px;box-shadow:0 14px 40px rgba(0,0,0,.35)}
.cap small{display:block;color:#7FB2E8;font-size:20px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}
.cap b{display:block;color:#fff;font-size:40px;font-weight:800;letter-spacing:-.01em;line-height:1.2}
.cap span{display:block;color:#C9D7EA;font-size:27px;margin-top:4px}
.card{position:absolute;inset:0;background:radial-gradient(1200px 700px at 75% 20%,#1E4F86 0%,#0B1B33 60%);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 160px}
.card img{width:120px;height:120px;border-radius:28px;background:#fff;padding:8px;margin-bottom:40px}
.card em{font-style:normal;color:#7FB2E8;font-size:28px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.card h1{font-size:104px;font-weight:800;letter-spacing:-.02em;line-height:1.05;margin-top:18px;max-width:1500px}
.card p{font-size:40px;color:#C9D7EA;margin-top:26px;max-width:1400px;line-height:1.4}
.card svg{position:absolute;right:-120px;bottom:-160px;width:760px;opacity:.08}
"""
PATTERN = '<svg viewBox="0 0 200 200"><g fill="none" stroke="#fff" stroke-width="1"><rect x="40" y="40" width="120" height="120"/><rect x="40" y="40" width="120" height="120" transform="rotate(45 100 100)"/><circle cx="100" cy="100" r="60"/><circle cx="100" cy="100" r="85"/></g></svg>'


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Gfx:
    def __init__(self, work):
        from playwright.sync_api import sync_playwright
        self.work = work; self.n = 0
        self.pw = sync_playwright().start(); self.b = self.pw.chromium.launch()
        self.p = self.b.new_page(viewport={"width": OW, "height": OH})
        self.logo = "data:image/png;base64," + base64.b64encode(LOGO.read_bytes()).decode() if LOGO.exists() else ""

    def png(self, body, transparent=True):
        self.n += 1; out = self.work / f"g{self.n:03d}.png"
        self.p.set_content(f"<style>{CSS}</style>{body}"); self.p.wait_for_timeout(50)
        self.p.screenshot(path=str(out), omit_background=transparent); return out

    def caption(self, tag, title, sub):
        return self.png(f'<div class="cap">{f"<small>{esc(tag)}</small>" if tag else ""}<b>{esc(title)}</b>{f"<span>{esc(sub)}</span>" if sub else ""}</div>')

    def card(self, eyebrow, title, sub):
        logo = f'<img src="{self.logo}">' if self.logo else ""
        return self.png(f'<div class="card">{PATTERN}{logo}<em>{esc(eyebrow)}</em><h1>{esc(title)}</h1>{f"<p>{esc(sub)}</p>" if sub else ""}</div>', False)

    def email(self, html, to, subject):
        """A mail-app window showing the email exactly as rendered; may be taller than the frame (we pan)."""
        self.n += 1; out = self.work / f"e{self.n:03d}.png"
        import html as H
        page = f"""<style>*{{margin:0;box-sizing:border-box}}body{{width:1920px;background:radial-gradient(1400px 800px at 70% 0%,#1E4F86 0%,#0B1B33 65%);font-family:Inter,system-ui,sans-serif;padding:70px 0 90px}}
        .win{{width:1040px;margin:0 auto;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45)}}
        .bar{{display:flex;gap:8px;padding:16px 20px;background:#F1F3F6;border-bottom:1px solid #E3E7ED}}.bar i{{width:13px;height:13px;border-radius:50%;background:#D5DAE2}}
        .hd{{padding:24px 34px 18px;border-bottom:1px solid #EEF1F5}}.hd h2{{font-size:28px;color:#0B1B33;font-weight:700;margin-bottom:16px}}
        .from{{display:flex;gap:14px;align-items:center}}.av{{width:46px;height:46px;border-radius:50%;background:#1E4F86;color:#fff;font-weight:800;font-size:20px;display:flex;align-items:center;justify-content:center}}
        .from b{{font-size:18px;color:#0B1B33}}.from span{{font-size:16px;color:#6B778A}}.from div div{{font-size:15px;color:#6B778A;margin-top:2px}}
        iframe{{display:block;width:100%;border:0}}</style>
        <div class="win"><div class="bar"><i></i><i></i><i></i></div><div class="hd"><h2>{H.escape(subject)}</h2>
        <div class="from"><div class="av">H</div><div><b>Hikmah Institute</b> <span>&lt;no-reply@hikmahinstitute.org.pk&gt;</span><div>to {H.escape(to)}</div></div></div></div>
        <iframe id="m" srcdoc="{H.escape(html)}"></iframe></div>"""
        self.p.set_viewport_size({"width": OW, "height": OH})
        self.p.set_content(page)
        self.p.wait_for_load_state("networkidle")
        self.p.wait_for_timeout(600)
        self.p.evaluate("() => { const f = document.getElementById('m'); f.style.height = f.contentDocument.documentElement.scrollHeight + 'px'; }")
        self.p.wait_for_timeout(300)
        self.p.screenshot(path=str(out), full_page=True)
        return out

    def close(self):
        self.b.close(); self.pw.stop()


# ---------------- timeline ----------------

def plan(data, dur):
    marks = sorted(data["marks"], key=lambda m: m["t"])
    chapters = [m for m in marks if m["type"] == "chapter"]
    failed = {m["chapter"] for m in marks if m["type"] == "failed"}
    cuts = [(m["t"], m["to"]) for m in marks if m["type"] == "cut"]
    fasts = [(m["t"], m["to"], m.get("speed", 4)) for m in marks if m["type"] == "fast"]
    ch_ranges = []
    for i, c in enumerate(chapters):
        end = chapters[i + 1]["t"] if i + 1 < len(chapters) else dur
        n = int(c["title"].split(".")[0]) if c["title"][:1].isdigit() else i + 1
        ch_ranges.append((c["t"], end, n, c))
    steps = []
    for (cs, ce, n, c) in ch_ranges:
        if n in failed: continue
        st = [m for m in marks if m["type"] == "step" and cs <= m["t"] < ce]
        for j, s in enumerate(st):
            a = cs if j == 0 else s["t"]
            b = st[j + 1]["t"] if j + 1 < len(st) else ce
            steps.append(dict(a=a, b=b, chapter=n, ctitle=re.sub(r"^\d+\.\s*", "", c["title"]), step=s))
    # pieces inside each step: cut out cuts, mark fast parts
    for s in steps:
        pts = sorted({s["a"], s["b"], *[x for f in fasts for x in f[:2] if s["a"] < x < s["b"]], *[x for c in cuts for x in c if s["a"] < x < s["b"]]})
        pcs = []
        for a, b in zip(pts, pts[1:]):
            if b - a < 0.04: continue
            mid = (a + b) / 2
            if any(x <= mid < y for x, y in cuts): continue
            sp = max([v for x, y, v in fasts if x <= mid < y], default=1)
            pcs.append(dict(a=a, b=b, fast=sp > 1, base=sp))
        s["pieces"] = pcs
    return steps


def camera_keys(marks, vw, vh):
    keys = []  # (t, z, cx, cy)
    for m in sorted(marks, key=lambda m: m["t"]):
        if m["type"] == "focus":
            z = ZOOM_IN
            if m.get("w"): z = max(1.0, min(ZOOM_IN, vw * 0.85 / max(m["w"], 1), vh * 0.8 / max(m.get("h", 1), 1)))
            keys.append((m["t"] - 0.25, z, m["x"], m["y"]))
        elif m["type"] == "wide" or (m["type"] == "step" and m.get("wide")):
            keys.append((m["t"], 1.0, vw / 2, vh / 2))
        elif m["type"] == "zoom":
            b = m["box"]; z = max(1.0, min(m.get("scale", 1.5), vw * 0.9 / b["width"], vh * 0.85 / b["height"]))
            keys.append((m["t"], z, b["x"] + b["width"] / 2, b["y"] + b["height"] / 2))
    # drop keys that are too close together (keep the later one)
    out = []
    for k in keys:
        if out and k[0] - out[-1][0] < 0.35: out[-1] = k
        else: out.append(k)
    return out


def cam_expr(keys, a, b, idx, vw, vh):
    """ffmpeg expression for camera value idx (1=z, 2=cx, 3=cy) over source time T=a+it."""
    base = {1: 1.0, 2: vw / 2, 3: vh / 2}[idx]
    before = [k for k in keys if k[0] + EASE <= a]
    v0 = before[-1][idx] if before else base
    terms, prev = [], v0
    for k in keys:
        if k[0] + EASE <= a or k[0] >= b: continue
        # value just before this key = prev
        d = k[idx] - prev
        if abs(d) > 1e-3:
            p = f"min(max(({a:.3f}+it-{k[0]:.3f})/{EASE},0),1)"
            terms.append(f"({d:.4f})*({p})*({p})*(3-2*({p}))")
        prev = k[idx]
    return f"{v0:.4f}" + "".join("+" + t for t in terms)


def zoompan(keys, a, b, vw, vh):
    up = 2  # work at 2x for smooth sub-pixel motion
    z = cam_expr(keys, a, b, 1, vw, vh)
    cx = cam_expr(keys, a, b, 2, vw, vh)
    cy = cam_expr(keys, a, b, 3, vw, vh)
    x = f"max(0,min(iw-iw/zoom,({cx})*{up}-iw/zoom/2))"
    y = f"max(0,min(ih-ih/zoom,({cy})*{up}-ih/zoom/2))"
    return f"scale={vw*up}:{vh*up}:flags=lanczos,zoompan=z='{z}':x='{x}':y='{y}':d=1:s={OW}x{OH}:fps={FPS}"


def fit_speeds(pieces, target):
    """Squeeze fast parts first (up to 14x), then normal parts (up to 2.2x), to fit `target` seconds."""
    n = sum(p["b"] - p["a"] for p in pieces if not p["fast"])
    f = sum(p["b"] - p["a"] for p in pieces if p["fast"])
    fs, ns = (max([p["base"] for p in pieces if p["fast"]], default=4)), 1.0
    if n + f / fs > target and f > 0:
        room = target - n
        fs = min(14.0, f / room) if room > 0.3 else 14.0
        fs = max(fs, max([p["base"] for p in pieces if p["fast"]], default=4))
    if n / ns + (f / fs if f else 0) > target and n > 0:
        room = target - (f / fs if f else 0)
        ns = min(2.2, n / room) if room > 0.3 else 2.2
    for p in pieces:
        p["speed"] = fs if p["fast"] else ns
    return sum((p["b"] - p["a"]) / p["speed"] for p in pieces)


def render_step(src, s, keys, cap_png, vo, vo_len, out, vw, vh):
    target = vo_len + 0.5
    vid_len = fit_speeds(s["pieces"], target)
    total = max(target, vid_len)
    inputs, chains, labels = [], [], []
    for i, p in enumerate(s["pieces"]):
        inputs += ["-ss", f"{p['a']:.3f}", "-to", f"{p['b']:.3f}", "-i", src]
        chains.append(f"[{i}:v]fps={FPS},setpts=PTS-STARTPTS,{zoompan(keys, p['a'], p['b'], vw, vh)},setpts=PTS/{p['speed']:.4f},fps={FPS}[p{i}]")
        labels.append(f"[p{i}]")
    n = len(s["pieces"])
    hold = max(0.0, total - vid_len)
    fc = ";".join(chains) + f";{''.join(labels)}concat=n={n}:v=1:a=0,tpad=stop_mode=clone:stop_duration={hold + 0.1:.3f}[v]"
    ci = n; ai = n + 1
    inputs += ["-loop", "1", "-i", cap_png, "-i", vo]
    fc += f";[{ci}:v]format=rgba,fade=in:st=0:d=0.3:alpha=1[cap];[v][cap]overlay=0:0:shortest=1[vo]"
    fc += f";[{ai}:a]adelay=150|150,apad,atrim=0:{total:.3f}[a]"
    run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", fc, "-map", "[vo]", "-map", "[a]", "-t", f"{total:.3f}", *ENC, *AENC, out])
    return total


def card_clip(png, vo, vo_len, out, min_len=2.2):
    secs = max(min_len, vo_len + 0.8)
    args = ["-loop", "1", "-t", f"{secs:.3f}", "-i", png]
    if vo:
        args += ["-i", vo]; fa = f"[1:a]adelay=300|300,apad,atrim=0:{secs:.3f}[a]"
    else:
        args += ["-f", "lavfi", "-t", f"{secs:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]; fa = "[1:a]anull[a]"
    run(["ffmpeg", "-y", "-v", "error", *args, "-filter_complex",
         f"[0:v]fps={FPS},fade=in:st=0:d=0.35,fade=out:st={secs - 0.35:.3f}:d=0.35[v];{fa}",
         "-map", "[v]", "-map", "[a]", "-t", f"{secs:.3f}", *ENC, *AENC, out])


def email_clip(png, cap_png, vo, vo_len, out):
    """Shows an email window and slowly scrolls down it while the voice plays."""
    import struct
    with open(png, "rb") as f: f.read(16); w, h = struct.unpack(">II", f.read(8))
    secs = max(3.0, vo_len + 1.0)
    pan = max(0, h - OH)
    y = f"{pan}*min(max((t-1.0)/{max(secs - 2.0, 0.5):.3f},0),1)" if pan else "0"
    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", f"{secs:.3f}", "-i", png, "-loop", "1", "-i", cap_png, "-i", vo, "-filter_complex",
         f"[0:v]crop={OW}:{OH}:0:'{y}',fps={FPS},fade=in:st=0:d=0.3[e];[1:v]format=rgba,fade=in:st=0:d=0.3:alpha=1[c];[e][c]overlay=0:0:shortest=1[v];[2:a]adelay=300|300,apad,atrim=0:{secs:.3f}[a]",
         "-map", "[v]", "-map", "[a]", "-t", f"{secs:.3f}", *ENC, *AENC, out])
    return secs


def concat(clips, out):
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{Path(c).resolve()}'\n" for c in clips))
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", out])
    lst.unlink()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--marks")
    ap.add_argument("--no-clips", action="store_true")
    args = ap.parse_args()
    src = Path(args.video).resolve()
    data = json.loads(Path(args.marks or src.with_suffix(".marks.json")).read_text())
    name = data.get("name", src.stem)
    vw, vh = data.get("width", 1280), data.get("height", 720)
    out_dir = src.parent / "final"; work = src.parent / f"work-{name}"
    shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True); out_dir.mkdir(exist_ok=True)

    dur = duration(src)
    steps = plan(data, dur)
    keys = camera_keys(data["marks"], vw, vh)
    print(f"{len(steps)} steps from {dur:.0f}s of footage")

    voice = Voice(work); g = Gfx(work)
    intro, outro = data.get("intro") or {}, data.get("outro") or {}
    intro_png = g.card("Tutorial", intro.get("title", name), intro.get("sub", ""))
    outro_png = g.card("JazakAllah khair", outro.get("title", "That's it"), outro.get("sub", ""))
    caps = [g.caption(s["ctitle"], s["step"]["title"], s["step"].get("sub", "")) for s in steps]
    inserts = {}
    ins_path = src.with_name(f"{src.stem.split('-')[0]}.emails.json")
    if ins_path.exists():
        emails_dir = ins_path.parent / "emails"
        meta = json.loads((emails_dir / "meta.json").read_text())
        for ins in json.loads(ins_path.read_text()):
            m = meta[ins["email"]]
            png = g.email((emails_dir / f"{ins['email']}.html").read_text(), m["to"], m["subject"])
            cap = g.caption("Email received", m["subject"], f"to {m['to']}")
            inserts.setdefault(ins["after"], []).append((png, cap, ins["say"]))
        print(f"{sum(len(v) for v in inserts.values())} email inserts")
    g.close()

    intro_c, outro_c = work / "intro.mp4", work / "outro.mp4"
    iv = voice.say(intro["say"]) if intro.get("say") else (None, 0)
    ov = voice.say(outro["say"]) if outro.get("say") else (None, 0)
    card_clip(intro_png, iv[0], iv[1], intro_c); card_clip(outro_png, ov[0], ov[1], outro_c, 2.0)

    by_ch = {}
    for i, s in enumerate(steps):
        say = s["step"].get("say") or s["step"]["title"]
        vo, vl = voice.say(say)
        out = work / f"s{i:03d}.mp4"
        t = render_step(str(src), s, keys, caps[i], vo, vl, out, vw, vh)
        by_ch.setdefault(s["chapter"], []).append(out)
        print(f"  {i + 1}/{len(steps)} {s['step']['title'][:40]:40s} {t:5.1f}s")
        for j, (png, cap, say_e) in enumerate(inserts.get(s["step"]["title"], [])):
            evo, evl = voice.say(say_e)
            eout = work / f"s{i:03d}e{j}.mp4"
            et = email_clip(png, cap, evo, evl, eout)
            by_ch[s["chapter"]].append(eout)
            print(f"      + email {et:4.1f}s")

    final = out_dir / f"{name}.mp4"
    concat([intro_c, *[c for ch in sorted(by_ch) for c in by_ch[ch]], outro_c], final)
    print(f"\nDone: {final}  {duration(final):.0f}s")
    if not args.no_clips:
        for ch in sorted(by_ch):
            title = next(s["ctitle"] for s in steps if s["chapter"] == ch)
            clip = out_dir / f"{name}-{ch:02d}-{slug(title)}.mp4"
            concat([*by_ch[ch], outro_c], clip)
            print(f"  {clip.name}  {duration(clip):.0f}s")


if __name__ == "__main__":
    main()
