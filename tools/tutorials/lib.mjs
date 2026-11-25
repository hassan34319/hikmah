// Helpers that make a Playwright recording look like a calm human demo:
// a visible cursor that glides, click ripples, smooth scrolling, steady typing,
// and a marks file (step captions + zoom boxes with timestamps) for the editor.

const CURSOR = `
(() => {
  if (window.__hkCursor) return; window.__hkCursor = true;
  const add = () => {
    const c = document.createElement('div');
    c.id = '__hk_cursor';
    c.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2l15 10.5-6.6 1.2 3.9 7.3-2.7 1.4-3.9-7.3L4 20z" fill="#0B1B33" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    let pos = { x: 640, y: 360 };
    try { pos = JSON.parse(sessionStorage.getItem('__hk_pos')) || pos; } catch {}
    Object.assign(c.style, { position: 'fixed', left: 0, top: 0, zIndex: 2147483647, pointerEvents: 'none',
      transform: 'translate(' + pos.x + 'px,' + pos.y + 'px)', transition: 'transform 0ms', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' });
    document.documentElement.appendChild(c);
    const st = document.createElement('style');
    st.textContent = '.__hk_ripple{position:fixed;z-index:2147483646;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(46,111,183,.35);animation:__hkr .55s ease-out forwards}@keyframes __hkr{from{transform:scale(.2);opacity:1}to{transform:scale(1.6);opacity:0}}html{scroll-behavior:auto}';
    document.documentElement.appendChild(st);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();`;

import readline from 'node:readline/promises';
import fs from 'node:fs';
import path from 'node:path';

/** Ask a question in the terminal, or through files when ASK_DIR is set (for unattended runs). */
export async function askHuman(q) {
  const dir = process.env.ASK_DIR;
  if (!dir) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const a = (await rl.question(`\n>>> ${q} `)).trim(); rl.close(); return a;
  }
  const ans = path.join(dir, 'answer.txt');
  fs.rmSync(ans, { force: true });
  fs.writeFileSync(path.join(dir, 'question.txt'), `${new Date().toISOString()} ${q}\n`);
  console.log(`>>> waiting for ${ans}: ${q}`);
  for (let i = 0; i < 600; i++) {
    if (fs.existsSync(ans)) { const a = fs.readFileSync(ans, 'utf8').trim(); if (a) { fs.rmSync(ans); fs.rmSync(path.join(dir, 'question.txt'), { force: true }); return a; } }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('No answer within 10 minutes');
}

export function makeDirector(page, t0, { inbox } = {}) {
  const marks = [];
  const HOLD = Number(process.env.HOLD ?? 0.65); // scale for on-screen holds
  const wait = (ms) => page.waitForTimeout(ms);
  const hold = (ms) => page.waitForTimeout(Math.round(ms * HOLD));
  const fast = async (fn, speed = 4) => { const from = now(); try { return await fn(); } finally { marks.push({ t: from, type: 'fast', to: now(), speed }); } };
  const now = () => (Date.now() - t0) / 1000;

  async function cursorTo(x, y) {
    const from = await page.evaluate(() => { try { return JSON.parse(sessionStorage.getItem('__hk_pos')) || { x: 640, y: 360 }; } catch { return { x: 640, y: 360 }; } });
    const dist = Math.hypot(x - from.x, y - from.y);
    const ms = Math.round(Math.min(1100, Math.max(350, dist * 0.75)));
    await page.evaluate(({ x, y, ms }) => {
      const c = document.getElementById('__hk_cursor'); if (!c) return;
      c.style.transition = `transform ${ms}ms cubic-bezier(.45,.05,.25,1)`;
      c.style.transform = `translate(${x}px,${y}px)`;
      sessionStorage.setItem('__hk_pos', JSON.stringify({ x, y }));
    }, { x, y, ms });
    await page.mouse.move(x, y, { steps: 8 });
    await wait(ms + 120);
  }

  async function reveal(loc) {
    await loc.waitFor({ state: 'visible' });
    const inView = await loc.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 70 && r.bottom <= innerHeight - 70; });
    if (!inView) {
      await loc.evaluate((el) => { const r = el.getBoundingClientRect(); window.scrollTo({ top: scrollY + r.top - innerHeight / 2 + r.height / 2, behavior: 'smooth' }); });
      await wait(900);
    }
    return loc.boundingBox();
  }

  async function point(loc, dx = 0.5, dy = 0.5) {
    const b = await reveal(loc);
    const x = b.x + b.width * dx, y = b.y + b.height * dy;
    marks.push({ t: now(), type: 'focus', x, y, w: b.width, h: b.height });
    await cursorTo(x, y);
    return b;
  }

  async function ripple() {
    await page.evaluate(() => {
      const p = JSON.parse(sessionStorage.getItem('__hk_pos') || '{"x":0,"y":0}');
      const r = document.createElement('div'); r.className = '__hk_ripple'; r.style.left = p.x + 'px'; r.style.top = p.y + 'px';
      document.documentElement.appendChild(r); setTimeout(() => r.remove(), 700);
    });
  }

  return {
    marks, wait: hold, now,
    /** Save a value for the editor (e.g. a student ID to show in an email). */
    note(key, value) { marks.push({ t: now(), type: 'note', key, value }); },
    /** Plus-address of the demo inbox: email('hk.student') -> you+hk.student@gmail.com */
    email(tag) { const [u, dom] = inbox.split('@'); return `${u}+${tag}@${dom}`; },
    chapter(title, sub = '') { marks.push({ t: now(), type: 'chapter', title, sub }); },
    async fill(loc, text) { await point(loc, 0.2); await ripple(); await loc.fill(text); await wait(300); },
    async check(loc, on = true) { await point(loc); await ripple(); await loc.setChecked(on, { force: true }); await wait(400); },
    async upload(loc, file) { await point(loc, 0.3); await ripple(); await loc.setInputFiles(file); await wait(700); },
    /** Pause the recording for a terminal question; the edit cuts the pause out. */
    async ask(q) {
      const from = now();
      const a = await askHuman(q);
      marks.push({ t: from, type: 'cut', to: now() });
      return a;
    },
    /** Start a new step: caption shown in the edit from this moment. */
    /** New step. `say` is the voiceover line; `wide` keeps the camera zoomed out (overviews). */
    step(title, sub = '', opts = {}) { marks.push({ t: now(), type: 'step', title, sub, ...(typeof opts === 'string' ? { say: opts } : opts) }); },
    /** Ask the camera to pull back to the full page. */
    wide() { marks.push({ t: now(), type: 'wide' }); },
    /** Ask the editor to zoom on this element for `secs` seconds. */
    async zoom(loc, secs = 3, scale = 1.6) { const b = await reveal(loc); marks.push({ t: now(), type: 'zoom', box: b, secs, scale }); },
    async click(loc, { nav = false } = {}) {
      await point(loc); await ripple(); await wait(150);
      if (nav) {
        const from = now();
        marks.push({ t: from + 0.05, type: 'wide' });
        const before = page.url();
        await loc.click();
        await page.waitForURL((u) => u.toString() !== before, { timeout: 20_000 }).catch(() => {});
        await page.waitForLoadState('networkidle').catch(() => {});
        marks.push({ t: from, type: 'fast', to: now(), speed: 6 });
        await wait(500);
      } else { await loc.click(); await wait(350); }
    },
    async type(loc, text, { clear = true } = {}) {
      await point(loc, 0.2); await ripple();
      await loc.click(); if (clear) await loc.fill('');
      await fast(() => loc.pressSequentially(text, { delay: 55 }), 4); await wait(250);
    },
    async select(loc, pick) {
      await point(loc, 0.3); await ripple(); await wait(250);
      const value = typeof pick === 'string' ? pick : await loc.evaluate((el, re) => [...el.options].find((o) => new RegExp(re, 'i').test(o.text))?.value, pick.source);
      await loc.selectOption(value); await wait(600);
    },
    async scrollBy(y) { marks.push({ t: now(), type: 'wide' }); await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), y); await wait(1100); },
    async scrollTop() { marks.push({ t: now(), type: 'wide' }); await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await wait(900); },
    async goto(url) { marks.push({ t: now(), type: 'wide' }); await fast(() => page.goto(url, { waitUntil: 'networkidle' }), 8); await wait(500); },
    /** Wait for something slow (a send, a save) and fast-forward through it in the edit. */
    async until(fn) { return fast(fn, 8); },
    point,
  };
}

export { CURSOR };
