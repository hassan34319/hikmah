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
import { askHuman, CURSOR, makeDirector } from './lib.mjs';

const name = process.argv[2] ?? 'admin';
const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const INBOX = process.env.DEMO_INBOX ?? '';
if (!/^[^@\s]+@[^@\s]+$/.test(INBOX)) { console.error('Set DEMO_INBOX to the same Gmail you put in demo-seed.sql, e.g. DEMO_INBOX=you@gmail.com'); process.exit(1); }
const only = (process.env.CHAPTERS ?? '').split(',').map((x) => parseInt(x, 10)).filter(Boolean);
const AUTH = path.resolve('.auth.json');
const [VW, VH] = (process.env.VIEWPORT ?? '1280x720').split('x').map(Number);
const OUT = path.resolve('out');
fs.mkdirSync(OUT, { recursive: true });

const mod = await import(`./scenarios/${name}.mjs`);
const opts = { auth: true, headed: false, ...(mod.options ?? {}) };
const launch = (headless) => chromium.launch({ headless, channel: 'chrome' }).catch(() => chromium.launch({ headless }));

if (opts.auth && !fs.existsSync(AUTH) && process.env.ADMIN_EMAIL) {
  // Unattended sign-in: request a code for ADMIN_EMAIL and ask for it (terminal or ASK_DIR).
  const b = await launch(true);
  const ctx = await b.newContext();
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}/sign-in?next=/admin`, { waitUntil: 'networkidle' });
  await pg.locator('input[name="email"]').fill(process.env.ADMIN_EMAIL);
  await pg.getByRole('button', { name: 'Send me a code' }).click();
  await pg.locator('input[name="code"]').waitFor({ timeout: 60_000 });
  const code = await askHuman(`Sign-in code sent to ${process.env.ADMIN_EMAIL}:`);
  if (/^https?:/.test(code)) await pg.goto(code); else { await pg.locator('input[name="code"]').fill(code); await pg.getByRole('button', { name: 'Sign in', exact: true }).click(); }
  await pg.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 60_000 });
  await pg.waitForLoadState('networkidle');
  if (pg.url().includes('/complete-profile')) {
    // First sign-in for this account: fill a basic profile so it can continue.
    await pg.locator('input[name="full_name"]').fill(process.env.ADMIN_NAME ?? 'Muhammad Hassan');
    await pg.locator('label:has(input[name="gender"][value="male"])').click();
    await pg.locator('input[name="phone"]').fill('0300 0000000');
    await pg.locator('input[name="date_of_birth"]').fill('1999-01-01');
    await pg.locator('label:has(input[name="occupation_type"][value="professional"])').click();
    const company = pg.locator('input[name="company"]');
    if (await company.count()) await company.fill('Hikmah Institute');
    await pg.locator('input[name="area"]').fill('Gulshan-e-Iqbal');
    await pg.locator('label:has(input[name="interests"][value="Seerah"])').click();
    await pg.getByRole('button', { name: /Save and continue/ }).click();
    await pg.waitForURL((u) => !u.pathname.startsWith('/complete-profile'), { timeout: 60_000 });
  }
  await ctx.storageState({ path: AUTH });
  await pg.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  if (pg.url().includes('not-allowed') || pg.url().includes('/sign-in')) { console.error('Signed in, but this account is not an admin. Run demo-seed.sql with this email as admin_email.'); process.exit(1); }
  await pg.waitForLoadState('networkidle');
  await ctx.storageState({ path: AUTH });
  await b.close();
  console.log('Signed in as', process.env.ADMIN_EMAIL);
}

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
  viewport: { width: VW, height: VH }, deviceScaleFactor: 1, acceptDownloads: true,
  ...(opts.auth ? { storageState: AUTH } : {}),
  recordVideo: { dir: OUT, size: { width: VW, height: VH } },
});
await ctx.addInitScript(CURSOR);
const page = await ctx.newPage();
page.on('dialog', (dlg) => dlg.accept().catch(() => {})); // confirm() prompts like "Email the feedback form to 7 people?"
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
fs.writeFileSync(path.join(OUT, `${tag}.marks.json`), JSON.stringify({ name: tag, base: BASE, width: VW, height: VH, intro: mod.intro ?? null, outro: mod.outro ?? null, chapters: mod.chapters.map((c) => ({ title: c.title, sub: c.sub ?? '' })), marks: d.marks, failures }, null, 2));
console.log(`\n${failures.length ? `${failures.length} chapter(s) failed, see the error screenshots in out/. Re-record them with CHAPTERS=${failures.map((f) => f.chapter).join(',')}` : 'All chapters recorded.'}`);
console.log(`Send these files:\n  ${file}\n  ${path.join(OUT, `${tag}.marks.json`)}`);
