// Records a tutorial as a 1920x1080 video plus a marks file for editing.
//
//   cd tools/tutorials && npm install
//   BASE_URL=https://your-site DEMO_INBOX=you@gmail.com node record.mjs admin
//   BASE_URL=https://your-site DEMO_INBOX=you@gmail.com node record.mjs student
//   CHAPTERS=4,7 ... node record.mjs admin     (re-record only some chapters)
//
// Output: out/<name>.webm and out/<name>.marks.json. Send both for editing.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CURSOR, makeDirector } from './lib.mjs';

const name = process.argv[2] ?? 'admin';
const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const INBOX = process.env.DEMO_INBOX ?? '';
if (!/^[^@\s]+@[^@\s]+$/.test(INBOX)) { console.error('Set DEMO_INBOX to the same Gmail you put in demo-seed.sql, e.g. DEMO_INBOX=you@gmail.com'); process.exit(1); }
const only = (process.env.CHAPTERS ?? '').split(',').map((x) => parseInt(x, 10)).filter(Boolean);
const AUTH = path.resolve('.auth.json');
const OUT = path.resolve('out');
fs.mkdirSync(OUT, { recursive: true });

const mod = await import(`./scenarios/${name}.mjs`);
const opts = { auth: true, headed: false, ...(mod.options ?? {}) };
const launch = (headless) => chromium.launch({ headless, channel: 'chrome' }).catch(() => chromium.launch({ headless }));

if (opts.auth && !fs.existsSync(AUTH)) {
  console.log('\nA Chrome window will open. Sign in with your admin email.');
  console.log('When the admin dashboard shows, recording starts on its own.\n');
  const b = await launch(false);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}/sign-in?next=/admin`);
  await pg.waitForURL((u) => u.pathname.startsWith('/admin') && !u.pathname.includes('not-allowed'), { timeout: 10 * 60_000 });
  await pg.waitForLoadState('networkidle');
  await ctx.storageState({ path: AUTH });
  await b.close();
  console.log('Signed in. Session saved in .auth.json (delete it to sign in as someone else).');
}

const browser = await launch(!opts.headed);
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, acceptDownloads: true,
  ...(opts.auth ? { storageState: AUTH } : {}),
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
await ctx.addInitScript(CURSOR);
const page = await ctx.newPage();
const d = makeDirector(page, Date.now(), { inbox: INBOX });
const failures = [];
const tag = only.length ? `${name}-ch${only.join('-')}` : name;

console.log(`Recording "${tag}"…`);
for (const [i, ch] of mod.chapters.entries()) {
  const n = i + 1;
  if (only.length && !only.includes(n)) continue;
  console.log(`  ${n}. ${ch.title}`);
  d.chapter(`${n}. ${ch.title}`, ch.sub ?? '');
  try {
    await ch.run({ page, d, BASE });
    await d.wait(1200);
  } catch (e) {
    console.error(`     ✗ chapter ${n} stopped: ${e.message.split('\n')[0]}`);
    failures.push({ chapter: n, title: ch.title, error: e.message.split('\n')[0], url: page.url() });
    d.marks.push({ t: d.now(), type: 'failed', chapter: n });
    await page.screenshot({ path: path.join(OUT, `${tag}-ch${n}-error.png`) }).catch(() => {});
    if (/sign-in|not-allowed/.test(page.url()) && opts.auth) console.error('     The session expired or this account is not an admin. Delete .auth.json and run again.');
  }
}
await d.wait(1200);
const video = page.video();
await ctx.close(); await browser.close();
const file = path.join(OUT, `${tag}.webm`);
fs.renameSync(await video.path(), file);
fs.writeFileSync(path.join(OUT, `${tag}.marks.json`), JSON.stringify({ name: tag, base: BASE, width: 1920, height: 1080, marks: d.marks, failures }, null, 2));
console.log(`\n${failures.length ? `${failures.length} chapter(s) failed, see the error screenshots in out/. Re-record them with CHAPTERS=${failures.map((f) => f.chapter).join(',')}` : 'All chapters recorded.'}`);
console.log(`Send these files:\n  ${file}\n  ${path.join(OUT, `${tag}.marks.json`)}`);
