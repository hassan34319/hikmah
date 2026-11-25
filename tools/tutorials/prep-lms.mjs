// Off-camera setup for the LMS tutorial on QS.
import { chromium } from 'playwright';
const BASE = 'https://hikmah-navy.vercel.app';
const QS = '10000000-0000-4000-8000-000000000001';
const b = await chromium.launch();
const page = async (file) => { const c = await b.newContext({ storageState: file, viewport: { width: 1280, height: 860 } }); return c.newPage(); };
const go = (p, u) => p.goto(BASE + u, { waitUntil: 'networkidle' });
const alert = async (p) => (await p.locator('.ad-alert').allTextContents()).join(' | ');
const steps = process.argv.slice(2);
const admin = await page('.auth.json');

if (steps.includes('structure')) {
  if (!steps.includes("roleonly")) await go(admin, `/admin/lms/${QS}`);
  for (const s of ['Weekdays', 'Weekend Morning']) {
    if (await admin.locator(`.lm-sec input[name="name"][value="${s}"]`).count()) continue;
    await admin.locator('form.lm-inline input[name="name"]').fill(s);
    await admin.locator('form.lm-inline select[name="venue_id"]').selectOption({ label: 'Main Campus' }).catch(() => admin.locator('form.lm-inline select[name="venue_id"]').selectOption({ index: 1 }));
    await admin.getByRole('button', { name: 'Add section' }).click();
    await admin.locator('.ad-alert').first().waitFor(); console.log(await alert(admin));
    await admin.reload({ waitUntil: 'networkidle' });
  }
  await go(admin, `/admin/lms/${QS}?tab=subjects`);
  if (!(await admin.locator('.lm-subj input[value="Quranic Arabic"]').count())) {
    await admin.locator('form.lm-inline input[name="name"]').fill('Quranic Arabic, Tajweed, Tafseer');
    await admin.getByRole('button', { name: 'Add', exact: true }).click();
    await admin.locator('.ad-alert').first().waitFor(); console.log(await alert(admin));
  }
  await go(admin, '/admin/admins');
  await admin.locator('input[name="email"][type="email"]').fill('hassaniqbal19343+hk.teacher@gmail.com');
  await admin.locator('select[name="role"]').selectOption('faculty');
  await admin.getByRole('button', { name: 'Give access' }).click();
  await admin.locator('.ad-alert').first().waitFor(); console.log(await alert(admin));
}

if (steps.includes('apply')) {
  for (const tag of ['hk.lms.ayesha', 'hk.lms.hamza', 'hk.lms.sana', 'hk.lms.fahad']) {
    const p = await page(`.auth-${tag}.json`);
    await go(p, '/register/quranic-sciences');
    if (!(await p.locator('main form').count())) { console.log(tag, 'no form (already applied?)', p.url()); continue; }
    const groups = await p.$$eval('main form input[type="radio"]', (xs) => [...new Set(xs.map((x) => x.name))]);
    for (const g of groups) await p.locator(`main form label:has(input[name="${g}"])`).first().click();
    for (const ta of await p.locator('main form textarea').all()) if (!(await ta.inputValue())) await ta.fill('I want to understand the Quran in its own language.');
    await p.locator('main form button[type="submit"], main form button:not([type])').last().click();
    await p.waitForURL(/\/account\/registrations\//, { timeout: 60000 }).then(() => console.log(tag, 'applied')).catch(async () => console.log(tag, 'FAILED', await alert(p)));
  }
}

if (steps.includes('select')) {
  await go(admin, `/admin/offerings/${QS}/admissions`);
  for (const [name, sec] of [['Hamza Qureshi', 'Weekdays'], ['Fahad Mirza', 'Weekdays'], ['Sana Javed', 'Weekend Morning']]) {
    await go(admin, `/admin/offerings/${QS}/admissions`);
    await admin.locator('tbody tr', { hasText: name }).first().locator('input[type="checkbox"]').check();
    const f = admin.locator('form', { has: admin.locator('select[name="decision"]') });
    await f.locator('select[name="decision"]').selectOption('selected');
    await f.locator('select[name="section_id"]').selectOption({ label: sec });
    await f.getByRole('button', { name: /^Mark/ }).click();
    await admin.waitForTimeout(4000); console.log(name, await alert(admin));
  }
  await go(admin, `/admin/offerings/${QS}/admissions`);
  await admin.getByRole('button', { name: /^Email \d+ decision/ }).click();
  await admin.waitForTimeout(10000); console.log(await alert(admin));
}
await b.close();
