// Signs in a +tag account (code read from the inbox via ASK_DIR), fills a first profile, saves .auth-<tag>.json
import { chromium } from 'playwright';
import { askHuman } from './lib.mjs';
const [tag, name, gender = 'male'] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? 'https://hikmah-navy.vercel.app';
const inbox = process.env.DEMO_INBOX ?? 'hassaniqbal19343@gmail.com';
const email = inbox.replace('@', `+${tag}@`);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const pg = await ctx.newPage();
await pg.goto(`${BASE}/sign-in?next=/account`, { waitUntil: 'networkidle' });
await pg.locator('input[name="email"]').fill(email);
await pg.getByRole('button', { name: 'Send me a code' }).click();
await pg.locator('input[name="code"]').waitFor({ timeout: 60_000 });
const code = await askHuman(`Sign-in code sent to ${email}:`);
await pg.locator('input[name="code"]').fill(code.replace(/\D/g, ''));
await pg.getByRole('button', { name: 'Sign in', exact: true }).click();
await pg.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 60_000 });
await pg.waitForLoadState('networkidle');
if (pg.url().includes('/complete-profile')) {
  await pg.locator('input[name="full_name"]').fill(name);
  await pg.locator(`label:has(input[name="gender"][value="${gender}"])`).click();
  await pg.locator('input[name="phone"]').fill(`03${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`);
  await pg.locator('input[name="date_of_birth"]').fill('2002-03-14');
  await pg.locator('label:has(input[name="occupation_type"][value="professional"])').click();
  const company = pg.locator('input[name="company"]'); if (await company.count()) await company.fill('Hikmah Institute');
  await pg.locator('input[name="area"]').fill('Gulshan-e-Iqbal');
  await pg.locator('label:has(input[name="interests"][value="Seerah"])').click();
  await pg.getByRole('button', { name: /Save and continue/ }).click();
  await pg.waitForURL((u) => !u.pathname.startsWith('/complete-profile'), { timeout: 60_000 });
}
await ctx.storageState({ path: `.auth-${tag}.json` });
console.log('SAVED', tag, email, pg.url());
await b.close();
