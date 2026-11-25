// Functional pass of the LMS on the live site (not recorded). Usage: node lmstest.mjs <step> [...]
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'https://hikmah-navy.vercel.app';
const OID = process.env.OID ?? '10000000-0000-4000-8000-000000000003'; // QHD
const SLUG = process.env.SLUG ?? 'quran-and-hadith';
const P = process.env.PFX ?? 'Test';
const TEACHER = process.env.TEACHER ?? 'hk.lmstest.teacher';
const STUDENT = process.env.STUDENT ?? 'hk.lmstest.student';
const SNAME = process.env.SNAME ?? 'Test Student One';
const email = (t) => `hassaniqbal19343+${t}@gmail.com`;
const SHOT = '/tmp/claude-0/-home-claude/11dc3c54-aceb-551a-a10a-a7d2466929e0/scratchpad/lt';
fs.mkdirSync(SHOT, { recursive: true });
const b = await chromium.launch();
const ctxs = {};
async function as(who) {
  const file = who === 'admin' ? '.auth.json' : `.auth-${who === 'teacher' ? TEACHER : STUDENT}.json`;
  if (!ctxs[who]) { const c = await b.newContext({ storageState: file, viewport: { width: 1280, height: 860 } }); const p = await c.newPage(); p.on('pageerror', (e) => console.log('PAGEERROR', who, e.message)); ctxs[who] = p; }
  return ctxs[who];
}
const go = async (p, u) => { const r = await p.goto(BASE + u, { waitUntil: 'networkidle' }); if (r.status() >= 400) throw new Error(`${u} -> ${r.status()}`); };
const alertText = async (p) => (await p.locator('.ad-alert').allTextContents()).join(' | ');
let n = 0; const shot = async (p, name) => p.screenshot({ path: `${SHOT}/${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true });
const ok = (m) => console.log('OK  ', m);
const fail = (m) => { console.log('FAIL', m); };

const steps = {
  async setup() {
    const p = await as('admin');
    await go(p, `/admin/lms/${OID}`);
    for (const s of ['A', 'B']) {
      if (await p.locator(`.lm-sec input[name="name"][value="${P} ${s}"]`).count()) continue;
      await p.locator('form.lm-inline input[name="name"]').fill(`${P} ${s}`);
      await p.locator('form.lm-inline select[name="venue_id"]').selectOption({ index: 1 });
      await p.getByRole('button', { name: 'Add section' }).click();
      await p.locator('.ad-alert--ok, .ad-alert--err').first().waitFor({ timeout: 20000 }); console.log('  ', await alertText(p));
      await p.reload({ waitUntil: 'networkidle' });
    }
    await shot(p, 'sections');
    await go(p, `/admin/lms/${OID}?tab=subjects`);
    if (!(await p.locator(`.lm-subj input[value="${P} Arabic"]`).count())) {
      await p.locator('form.lm-inline input[name="name"]').fill(`${P} Arabic, ${P} Tajweed`);
      await p.getByRole('button', { name: 'Add', exact: true }).click();
      await p.locator('.ad-alert--ok, .ad-alert--err').first().waitFor({ timeout: 20000 }); console.log('  ', await alertText(p));
    }
    await shot(p, 'subjects');
    ok('sections and subjects');
  },
  async role() {
    const p = await as('admin');
    await go(p, '/admin/admins');
    await p.locator('input[name="email"]').fill(email(TEACHER));
    await p.locator('select[name="role"]').selectOption('faculty');
    await p.getByRole('button', { name: 'Give access' }).click();
    await p.locator('.ad-alert').first().waitFor({ timeout: 20000 }); console.log('  ', await alertText(p));
    await shot(p, 'role');
  },
  async assign() {
    const p = await as('admin');
    await go(p, `/admin/lms/${OID}?tab=subjects`);
    const f = p.locator('form', { has: p.getByRole('button', { name: 'Assign teacher' }) });
    await f.locator('select[name="subject_id"]').selectOption({ label: `${P} Arabic` });
    const opts = await f.locator('select[name="teacher_id"] option').allTextContents(); console.log('   teachers:', opts.join(', '));
    await f.locator('select[name="teacher_id"]').selectOption({ label: opts.find((o) => o.includes('Test Teacher') || o.includes(process.env.TNAME ?? '___')) });
    // only our sections
    for (const lab of await f.locator('.ad-chipset label').all()) { const t = (await lab.textContent()).trim(); const cb = lab.locator('input'); if (t.startsWith(P) !== await cb.isChecked()) await lab.click(); }
    await f.getByRole('button', { name: 'Assign teacher' }).click();
    await f.locator('.ad-alert').waitFor({ timeout: 20000 }); console.log('  ', await alertText(p));
    await p.reload({ waitUntil: 'networkidle' }); await shot(p, 'assign');
    await go(p, `/admin/lms/${OID}?tab=timetable`);
    const t = p.locator('form', { has: p.getByRole('button', { name: 'Add to timetable' }) });
    for (const lab of await t.locator('fieldset').first().locator('label').all()) if ((await lab.textContent()).trim().startsWith(P)) await lab.click();
    for (const d of ['Mon', 'Wed']) await t.locator('fieldset').nth(1).locator('label', { hasText: d }).click();
    await t.locator('input[name="starts"]').fill('18:00'); await t.locator('input[name="ends"]').fill('19:30');
    await t.locator('select[name="subject_id"]').selectOption({ label: `${P} Arabic` });
    await t.locator('input[name="room"]').fill('Room 2');
    await t.getByRole('button', { name: 'Add to timetable' }).click();
    await t.locator('.ad-alert').waitFor({ timeout: 20000 }); console.log('  ', await alertText(p));
    await p.reload({ waitUntil: 'networkidle' }); await shot(p, 'timetable');
  },
  async apply() {
    const p = await as('student');
    await go(p, `/register/${SLUG}`);
    await shot(p, 'apply-form');
    // fill whatever the course form asks: first option of each radio group, text for textareas
    const groups = await p.$$eval('main form input[type="radio"]', (xs) => [...new Set(xs.map((x) => x.name))]);
    for (const g of groups) await p.locator(`main form label:has(input[name="${g}"])`).first().click();
    for (const ta of await p.locator('main form textarea').all()) if (!(await ta.inputValue())) await ta.fill('I want to understand the Quran and Hadith properly.');
    for (const s of await p.locator('main form select').all()) if (!(await s.inputValue())) await s.selectOption({ index: 1 }).catch(() => {});
    await p.locator('main form button[type="submit"], main form button:not([type])').last().click();
    await p.waitForURL(/\/account\/registrations\//, { timeout: 60000 }).catch(async () => { await shot(p, 'apply-fail'); throw new Error('apply did not finish: ' + await alertText(p)); });
    await shot(p, 'applied'); ok('applied');
  },
  async select() {
    const p = await as('admin');
    await go(p, `/admin/offerings/${OID}/admissions`);
    const row = p.locator('tbody tr', { hasText: SNAME }).first();
    await row.locator('input[type="checkbox"]').check();
    const f = p.locator('form', { has: p.locator('select[name="decision"]') });
    await f.locator('select[name="decision"]').selectOption('selected');
    const sec = f.locator('select[name="section_id"]');
    console.log('   section options:', (await sec.locator('option').allTextContents()).join(', '));
    await sec.selectOption({ label: `${P} A` });
    await f.getByRole('button', { name: /^Mark/ }).click();
    await p.waitForTimeout(4000); console.log('  ', await alertText(p));
    await p.reload({ waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /^Email \d+ decision/ }).click();
    await p.waitForTimeout(8000); console.log('  ', await alertText(p));
    await shot(p, 'decisions');
    await go(p, `/admin/lms/${OID}`); await shot(p, 'roster');
    console.log('   roster has student:', await p.locator('tbody tr', { hasText: SNAME }).count());
  },
  async teach() {
    const p = await as('teacher');
    await go(p, '/teach'); await shot(p, 'teach-home');
    // material with a file
    await go(p, '/teach/materials/new');
    const f = p.locator('form.lm-editor');
    console.log('   scopes:', (await f.locator('select[name="scope"] option').allTextContents()).join(', '));
    await f.locator('input[name="title"]').fill(`${P}: Lesson 1 slides`);
    await f.locator('input[name="topic"]').fill('Week 1');
    await f.locator('textarea[name="body"]').fill('Please read these before Monday.');
    fs.writeFileSync('/tmp/claude-0/-home-claude/11dc3c54-aceb-551a-a10a-a7d2466929e0/scratchpad/lesson1.pdf', '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    await f.locator('.lm-drop input[type="file"]').setInputFiles('/tmp/claude-0/-home-claude/11dc3c54-aceb-551a-a10a-a7d2466929e0/scratchpad/lesson1.pdf');
    await f.locator('.lm-files li').first().waitFor({ timeout: 30000 }).catch(async () => { await shot(p, 'upload-fail'); console.log('   upload:', await alertText(p)); });
    await f.locator('textarea[name="links"]').fill('Tafsir video | https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await f.getByRole('button', { name: 'Post material' }).click();
    await p.waitForURL(/\/teach\/materials\?saved/, { timeout: 60000 }).catch(async () => { await shot(p, 'post-fail'); console.log('   post:', await alertText(p)); });
    await shot(p, 'materials'); ok('material');
    // announcement
    await go(p, '/teach/materials/new?kind=announcement');
    await p.locator('input[name="title"]').fill(`${P}: No class on Friday`);
    await p.locator('textarea[name="body"]').fill('Class is moved to Saturday 10am this week.');
    await p.getByRole('button', { name: 'Post announcement' }).click();
    await p.waitForURL(/saved=announcement/, { timeout: 60000 }).catch(async () => { await shot(p, 'ann-fail'); console.log('   ann:', await alertText(p)); });
    ok('announcement');
    // assignment
    await go(p, '/teach/assignments/new');
    await p.locator('input[name="title"]').fill(`${P}: Translate Surah Al-Asr`);
    await p.locator('textarea[name="instructions"]').fill('Translate each ayah and write one lesson from it.');
    await p.locator('input[name="max_marks"]').fill('10');
    await p.getByRole('button', { name: 'Set assignment' }).click();
    await p.waitForURL(/\/teach\/assignments\/[0-9a-f-]{36}/, { timeout: 60000 }).catch(async () => { await shot(p, 'asg-fail'); console.log('   asg:', await alertText(p)); });
    await shot(p, 'assignment'); ok('assignment ' + p.url());
    // quiz
    await go(p, '/teach/quizzes/new');
    await p.locator('input[name="title"]').fill(`${P}: Week 1 quiz`);
    await p.locator('input[name="time_limit_min"]').fill('10');
    await p.getByRole('button', { name: /Create quiz/ }).click();
    await p.waitForURL(/\/teach\/quizzes\/[0-9a-f-]{36}$/, { timeout: 60000 }).catch(async () => { await shot(p, 'quiz-fail'); console.log('   quiz:', await alertText(p)); });
    const qf = p.locator('aside form', { has: p.locator('textarea[name="prompt"]') });
    await qf.locator('textarea[name="prompt"]').fill('What does "kitab" mean?');
    const o = qf.locator('input[name="option"]'); await o.nth(0).fill('Pen'); await o.nth(1).fill('Book'); await o.nth(2).fill('Door'); await o.nth(3).fill('House');
    await qf.locator('input[name="correct"]').nth(1).check();
    await qf.getByRole('button', { name: 'Add question' }).click();
    await qf.locator('.ad-alert').waitFor({ timeout: 20000 }); console.log('  ', await alertText(p));
    await p.waitForTimeout(1500);
    const qf2 = p.locator('aside form', { has: p.locator('textarea[name="prompt"]') });
    await qf2.locator('label', { hasText: 'Short answer' }).click();
    await qf2.locator('textarea[name="prompt"]').fill('Translate: Bismillah ir-Rahman ir-Raheem');
    await qf2.locator('input[name="points"]').fill('3');
    await qf2.locator('textarea[name="model_answer"]').fill('In the name of Allah, the Most Gracious, the Most Merciful');
    await qf2.getByRole('button', { name: 'Add question' }).click();
    await p.waitForTimeout(3000);
    await p.reload({ waitUntil: 'networkidle' });
    console.log('   questions:', await p.locator('.lm-qs > li').count());
    await p.getByRole('button', { name: /Publish quiz/ }).click();
    await p.waitForTimeout(5000); console.log('  ', await alertText(p));
    await shot(p, 'quiz'); ok('quiz');
  },
  async learn() {
    const p = await as('student');
    await go(p, '/learn'); await shot(p, 'learn-home');
    console.log('   home h1:', await p.locator('h1').textContent(), '| todo:', await p.locator('.lm-list li').count());
    await go(p, '/learn/materials'); await shot(p, 'learn-materials');
    const link = p.locator('.lm-attach__item', { hasText: 'lesson1.pdf' }).first();
    const href = await link.getAttribute('href');
    const r = await p.request.get(BASE + href, { maxRedirects: 0 }).catch((e) => ({ status: () => 'ERR ' + e.message, headers: () => ({}) }));
    console.log('   file route:', r.status(), (r.headers().location ?? '').slice(0, 80));
    await go(p, '/learn/timetable'); await shot(p, 'learn-timetable');
    await go(p, '/learn/assignments'); await p.locator('.lm-list a').first().click(); await p.waitForLoadState('networkidle');
    await p.locator('textarea[name="body"]').fill('By time, indeed mankind is in loss...');
    await p.locator('.lm-drop input[type="file"]').setInputFiles('/tmp/claude-0/-home-claude/11dc3c54-aceb-551a-a10a-a7d2466929e0/scratchpad/lesson1.pdf');
    await p.locator('.lm-files li').first().waitFor({ timeout: 30000 }).catch(async () => console.log('   sub upload:', await alertText(p)));
    await p.getByRole('button', { name: 'Hand in' }).click();
    await p.locator('.ad-alert').first().waitFor({ timeout: 30000 }); console.log('  ', await alertText(p));
    await shot(p, 'learn-submitted'); ok('submitted');
    await go(p, '/learn/quizzes'); await p.locator('.lm-list a').first().click(); await p.waitForLoadState('networkidle');
    await shot(p, 'quiz-start');
    await p.getByRole('button', { name: 'Start quiz' }).click(); await p.waitForLoadState('networkidle');
    await p.locator('.lq-opt', { hasText: 'Book' }).click(); await p.waitForTimeout(1500);
    await p.getByRole('button', { name: 'Next' }).click();
    await p.locator('.lq-text').fill('In the name of Allah, the Merciful'); await p.waitForTimeout(1500);
    await shot(p, 'quiz-play');
    await p.getByRole('button', { name: 'Finish' }).click();
    await p.getByRole('button', { name: 'Hand in' }).click();
    await p.waitForURL(/done=1/, { timeout: 30000 }); await shot(p, 'quiz-done');
    console.log('   score:', await p.locator('.lm-result__score').textContent());
  },
  async mark() {
    const p = await as('teacher');
    await go(p, '/teach'); await shot(p, 'teach-tomark');
    await go(p, '/teach/assignments'); await p.locator('tbody a').first().click(); await p.waitForLoadState('networkidle');
    const m = p.locator('form.lm-mark').first();
    await m.locator('input[name="marks"]').fill('8'); await m.locator('textarea[name="feedback"]').fill('Good work. Check ayah 3.');
    await m.getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(4000);
    console.log('   mark:', await m.locator('.lm-ok, .lm-err').textContent().catch(() => '?'));
    await shot(p, 'marked');
    await go(p, '/teach/quizzes'); await p.locator('tbody a').first().click(); await p.waitForLoadState('networkidle');
    await go(p, p.url().replace(BASE, '') + '?tab=results');
    await p.locator('a', { hasText: 'Mark' }).first().click(); await p.waitForLoadState('networkidle');
    await p.locator('input[name^="pts_"]').last().fill('2.5');
    await p.getByRole('button', { name: 'Save marks' }).click(); await p.waitForTimeout(4000);
    console.log('  ', await alertText(p)); await shot(p, 'quiz-marked');
    const s = await as('student');
    await go(s, '/learn/results'); await shot(s, 'results');
    console.log('   results rows:', await s.locator('tbody tr').count(), '|', (await s.locator('tbody').textContent()).replace(/\s+/g, ' ').slice(0, 200));
  },
};
for (const name of process.argv.slice(2)) {
  console.log('==', name);
  try { await steps[name](); } catch (e) { console.log('ERROR', name, e.message.split('\n')[0]); for (const [w, p] of Object.entries(ctxs)) await p.screenshot({ path: `${SHOT}/err-${name}-${w}.png`, fullPage: true }).catch(() => {}); }
}
await b.close();
