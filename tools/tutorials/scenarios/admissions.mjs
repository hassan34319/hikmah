// Admissions, both sides, one continuous recording (~3 minutes with voice).
// Needs migrations 10-11, demo-seed.sql and demo-admissions.sql. The applicant is the student from the student tutorial.
import { solve, watchItems } from '../solver.mjs';

const APPLICANT_TAG = process.env.APPLICANT_TAG ?? 'hk.studentvb20';
const COURSE = '10000000-0000-4000-8000-000000000004';

export const intro = { title: 'Admissions', sub: 'From application to student ID', say: "Here's how admissions work at Hikmah, from the admission test to the interview to the final decision, for both the team and the applicant." };
export const outro = { title: 'Welcome to Hikmah', sub: 'Admissions, start to finish', say: "That's admissions, start to finish. JazakAllah khair." };

let applicantState = null;
let adminState = null;

/** Switch the browser between the admin and the applicant login. */
async function as(who, { ctx, page, d, BASE, AUTH }) {
  const fs = await import('node:fs');
  if (!adminState) adminState = JSON.parse(fs.readFileSync(AUTH, 'utf8'));
  if (who === 'applicant' && !applicantState) {
    // Sign the applicant in (code from the inbox), off camera.
    await ctx.clearCookies();
    const from = d.now();
    await page.goto(`${BASE}/sign-in?next=/account`, { waitUntil: 'networkidle' });
    await page.locator('input[name="email"]').fill(d.email(APPLICANT_TAG));
    await page.getByRole('button', { name: 'Send me a code' }).click();
    await page.locator('input[name="code"]').waitFor({ timeout: 60_000 });
    const code = await d.ask(`Sign-in code sent to ${d.email(APPLICANT_TAG)}:`);
    await page.locator('input[name="code"]').fill(code.replace(/\D/g, ''));
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 60_000 });
    applicantState = await ctx.storageState();
    d.marks.push({ t: from, type: 'cut', to: d.now() });
    return;
  }
  await ctx.clearCookies();
  await ctx.addCookies((who === 'admin' ? adminState : applicantState).cookies);
}

const adm = (BASE, q = '') => `${BASE}/admin/offerings/${COURSE}/admissions${q}`;
const row = (page, name) => page.locator('tbody tr', { hasText: name }).first();
async function submitAndWait(page, d, button, result) {
  for (let i = 0; i < 3; i++) {
    await d.click(button);
    if (await d.until(() => result.first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false))) return;
  }
  throw new Error('No result after submitting');
}

export const chapters = [
  {
    title: 'Send the admission test', sub: 'Admin',
    async run(ctxArgs) {
      const { page, d, BASE } = ctxArgs;
      await as('applicant', ctxArgs);          // sign the applicant in off camera first
      await as('admin', ctxArgs);
      await d.goto(adm(BASE));
      d.step('The Admissions tab', 'Every application to the course, by stage', { say: 'Every course has an Admissions tab. It shows each application and where it stands.', wide: true });
      await d.wait(1800);
      d.step('Send the test', 'Tick applicants, press Send', { say: "Tick the applicants you'd like to shortlist, and press Send test. Each one gets a personal link by email." });
      await d.check(row(page, 'Abdullah Khan').locator('input[type="checkbox"]'));
      await submitAndWait(page, d, page.getByRole('button', { name: /^Send test to/ }), page.locator('.am-step .ad-alert--ok, .am-step .ad-alert--err'));
      await d.point(page.locator('.am-step .ad-alert').first());
      await d.wait(1200);
    },
  },
  {
    title: 'Take the test', sub: 'Applicant',
    async run(ctxArgs) {
      const { page, d, BASE } = ctxArgs;
      await as('applicant', ctxArgs);
      await d.goto(`${BASE}/account`);
      await d.click(page.getByRole('link', { name: /Darse Nizami/ }).first(), { nav: true });
      d.step('The applicant’s side', 'The link is in the email and their account', { say: "On the applicant's side, the test link is in the email and in their account." });
      await d.click(page.getByRole('link', { name: /admission test/i }).first(), { nav: true });
      d.step('Before they start', 'About 15 minutes, five quick games', { say: 'They see what to expect: about fifteen minutes of quick puzzles, in one sitting, without AI.', wide: true });
      await d.wait(2000);
      await d.click(page.getByRole('link', { name: /start the test/i }), { nav: true });
      const items = watchItems(page);
      const said = {};
      const lines = {
        pattern: ['Pattern grid', 'Pick the piece that completes the grid', 'Five mini-games. First, pattern grids: pick the piece that completes the grid.'],
        sequence: ['Number sequences', 'What comes next?', 'Then number sequences.'],
        odd: ['Odd one out', 'Spot the figure that breaks the rule', 'Odd one out.'],
        memory: ['Memory flash', 'Repeat the tiles in order', 'Memory flash, where the sequence gets longer each round.'],
        logic: ['Speed logic', 'Made-up words, real logic', 'And quick logic, with made-up words, so general knowledge and AI do not help.'],
      };
      let n = 0;
      for (let guard = 0; guard < 60; guard++) {
        const intro = page.locator('.tp-intro button');
        if (await intro.count()) { await page.waitForTimeout(900); await intro.click(); }
        const card = await page.waitForSelector('.tp-card h3, .tp-essay', { timeout: 30_000 });
        if (await page.locator('.tp-essay').count()) break;
        await page.waitForFunction(() => !document.querySelector('.tp-pop'), null, { timeout: 5000 }).catch(() => {});
        for (let w = 0; w < 30 && !items.item; w++) await page.waitForTimeout(100);
        const item = items.item; items.item = null;
        if (!item) continue;
        n++;
        if (!said[item.game]) { said[item.game] = 1; const [t, sub, say] = lines[item.game]; d.step(t, sub, { say }); }
        const ans = solve(item);
        const miss = n === 9 || n === 27; // a couple of honest mistakes
        if (item.game === 'memory') {
          await page.waitForSelector('text=/Your turn/', { timeout: 20_000 });
          for (const tile of ans) await page.locator('.tp-mem button').nth(miss ? (tile + 1) % 9 : tile).click();
        } else {
          await page.waitForTimeout(900 + Math.random() * 1200);
          const opts = page.locator('.tp-opts button');
          await opts.nth(miss ? (ans + 1) % (await opts.count()) : ans).click();
        }
        await page.waitForTimeout(700);
        void card;
      }
      d.step('Why Hikmah?', 'A short essay and a no-AI pledge', { say: 'Last, a short note on why they want to study at Hikmah, with a pledge that they wrote it themselves.' });
      await d.type(page.locator('.tp-essay textarea'), 'I want to study the deen properly alongside my engineering degree, so I can understand the Quran myself and serve my family and community.');
      await d.check(page.locator('.tp-pledge input'));
      await d.click(page.getByRole('button', { name: 'Submit my test' }));
      await d.until(() => page.getByText('Test complete').waitFor({ timeout: 30_000 }));
      await d.point(page.getByText('Test complete'));
      await d.wait(1200);
    },
  },
  {
    title: 'Results and interviews', sub: 'Admin',
    async run(ctxArgs) {
      const { page, d, BASE } = ctxArgs;
      await as('admin', ctxArgs);
      await d.goto(adm(BASE));
      d.step('Ranked results', 'Highest overall score first', { say: 'Back in the dashboard, applicants are ranked by score. Anyone who left the test window is flagged.', wide: true });
      await d.point(row(page, 'Abdullah Khan'));
      await d.wait(1200);
      await d.click(row(page, 'Abdullah Khan').getByRole('link', { name: 'Abdullah Khan' }), { nav: true });
      d.step('Each applicant in full', 'Score per game, essay and answers', { say: 'Open anyone to see their score in each game, their essay, and their application.' });
      await d.point(page.locator('aside .ad-card').first(), 0.5, 0.35);
      await d.wait(2200);
      d.step('Invite to interview', 'Everyone above a cut-off score', { say: 'Then invite the strongest to interview. Set a cut-off score, and everyone above it gets an email to book a time.' });
      const cut = page.locator('input[name="cutoff"]');
      await d.fill(cut, '70');
      await submitAndWait(page, d, page.locator('.am-cut button'), page.locator('.am-step .ad-alert--ok, .am-step .ad-alert--err'));
      await d.point(page.locator('.am-step .ad-alert').first());
      await d.wait(1200);
    },
  },
  {
    title: 'Book an interview', sub: 'Applicant',
    async run(ctxArgs) {
      const { page, d, BASE } = ctxArgs;
      await as('applicant', ctxArgs);
      await d.goto(`${BASE}/account`);
      await d.click(page.getByRole('link', { name: /Darse Nizami/ }).first(), { nav: true });
      await d.click(page.getByRole('link', { name: /Book your interview/i }).first(), { nav: true });
      d.step('Pick a time', 'From the slots the team opened', { say: 'The applicant picks a time from the slots the team has opened, and gets a confirmation email.' });
      await d.click(page.locator('.adm-slots button:not([disabled])').first());
      await submitAndWait(page, d, page.getByRole('button', { name: /Book this time|Change my time/ }), page.locator('.hk-alert'));
      await d.point(page.locator('.hk-alert').first());
      await d.wait(1500);
    },
  },
  {
    title: 'The interview', sub: 'Interviewer',
    async run(ctxArgs) {
      const { page, d, BASE } = ctxArgs;
      await as('admin', ctxArgs);
      await d.goto(`${BASE}/admin/interviews`);
      d.step('Interviews', 'Booked interviews, in time order', { say: 'Interviewers see the day\'s interviews in time order. They can only see the people they interview.', wide: true });
      await d.wait(1500);
      await d.click(page.getByRole('link', { name: 'Abdullah Khan' }).first(), { nav: true });
      d.step('Score out of 10', 'With notes for the team', { say: 'They open the applicant\'s file, read the essay, and give a score out of ten with notes.' });
      await d.point(page.locator('aside'), 0.5, 0.3);
      await d.wait(1200);
      await d.click(page.locator('.iv-score button', { hasText: /^8$/ }));
      await d.type(page.locator('textarea[name="notes"]'), 'Sincere and well prepared. Suits the weekend batch.');
      await submitAndWait(page, d, page.getByRole('button', { name: /Save score|Update score/ }), page.locator('aside .ad-alert'));
      await d.wait(1000);
    },
  },
  {
    title: 'Decide and notify', sub: 'Admin',
    async run(ctxArgs) {
      const { page, d, BASE } = ctxArgs;
      await d.goto(adm(BASE, '?stage=interviewed'));
      d.step('Side by side', 'Test, interview and overall', { say: 'Now the test and interview scores sit side by side, with an overall score.', wide: true });
      await d.wait(1600);
      d.step('Decide', 'Selected, waitlisted or not selected', { say: 'Tick who to accept, choose Selected, their batch and campus, and mark them.' });
      await d.check(row(page, 'Abdullah Khan').locator('input[type="checkbox"]'));
      await d.check(row(page, 'Bilal Khan').locator('input[type="checkbox"]'));
      await page.locator('select[name="decision"]').selectOption('selected');
      await d.fill(page.locator('input[name="batch"]'), 'Weekend morning');
      await page.locator('select[name="campus"]').selectOption({ label: 'Main Campus' });
      await submitAndWait(page, d, page.getByRole('button', { name: /^Mark/ }), page.locator('.am-step .ad-alert--ok, .am-step .ad-alert--err'));
      d.step('Send the decisions', 'Selected applicants get a student ID', { say: 'When you\'re ready, send the decisions. Selected applicants get their student ID by email.' });
      await submitAndWait(page, d, page.getByRole('button', { name: /^Email \d+ decision/ }), page.locator('.am-step .ad-alert--ok, .am-step .ad-alert--err'));
      await settle(page);
      await d.goto(adm(BASE, '?stage=selected'));
      const sid = (await row(page, 'Abdullah Khan').locator('td').last().textContent())?.trim() ?? '';
      d.note('student_id', sid);
      await d.point(row(page, 'Abdullah Khan'));
      await d.wait(1500);
    },
  },
  {
    title: 'Welcome', sub: 'Applicant',
    async run(ctxArgs) {
      const { page, d, BASE } = ctxArgs;
      await as('applicant', ctxArgs);
      await d.goto(`${BASE}/account`);
      await d.click(page.getByRole('link', { name: /Darse Nizami/ }).first(), { nav: true });
      await d.click(page.getByRole('link', { name: /Admission status/i }).first(), { nav: true });
      d.step('Welcome to Hikmah', 'Their student ID, batch and campus', { say: 'And the applicant sees the good news, with their student ID, batch and campus.', wide: true });
      await d.point(page.locator('.adm-id'));
      await d.wait(2500);
    },
  },
];

async function settle(page) { await page.waitForLoadState('networkidle').catch(() => {}); }
