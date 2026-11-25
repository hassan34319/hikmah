import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ storageState: '.auth-hk.lmstest.teacher.json' }); const p = await c.newPage();
for (let i = 0; i < 110; i++) {
  await p.goto('https://hikmah-navy.vercel.app/teach/materials/new?kind=announcement', { waitUntil: 'networkidle' });
  await p.locator('input[name="title"]').fill('Test: migration probe');
  await p.locator('textarea[name="body"]').fill('Probe.');
  await p.locator('input[name="notify"]').setChecked(false);
  await p.getByRole('button', { name: 'Post announcement' }).click();
  const ok = await p.waitForURL(/saved=announcement/, { timeout: 20000 }).then(() => true).catch(() => false);
  if (ok) { console.log('FIX LIVE', new Date().toISOString()); break; }
  await p.waitForTimeout(45000);
}
await b.close();
