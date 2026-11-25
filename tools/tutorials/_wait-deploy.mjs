import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ storageState: '.auth-hk.lmstest.teacher.json' }); const p = await c.newPage();
for (let i = 0; i < 120; i++) {
  await p.goto('https://hikmah-navy.vercel.app/teach/assignments', { waitUntil: 'networkidle' });
  const has = await p.evaluate(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.selectorText === '.lm-subrow'); } catch { return false; } }));
  if (has) { console.log('DEPLOYED', new Date().toISOString()); break; }
  await p.waitForTimeout(45000);
}
await b.close();
