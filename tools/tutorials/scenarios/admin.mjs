// Admin walkthrough, about 2.5 minutes with voiceover. Needs supabase/demo/demo-seed.sql loaded.
// Everything created uses demo- page links or +hk. emails, so demo-cleanup.sql removes it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POSTER = path.join(ROOT, 'apps/web/public/seed/event-striving-in-deen.jpg');
const RUN = Date.now().toString(36).slice(-4); // keeps page links unique across runs

export const intro = { title: 'Hikmah Admin Guide', sub: 'Everything you can do in the dashboard', say: "This is the Hikmah admin dashboard. In about two minutes, here's everything you can do with it." };
export const outro = { title: "That's the dashboard", sub: 'Questions? Ask the Hikmah tech team.', say: "That's the dashboard. JazakAllah khair." };

function nextEventTimes() {
  const d = new Date(Date.now() + 5 * 3600_000);
  d.setUTCDate(d.getUTCDate() + 21 + ((5 - d.getUTCDay() + 7) % 7));
  const day = d.toISOString().slice(0, 10);
  return { start: `${day}T19:30`, end: `${day}T21:30` };
}
const side = (page, label) => page.locator('.ad-side').getByRole('link', { name: label, exact: true });
const settle = (page) => page.waitForLoadState('networkidle').catch(() => {});

/** Click a form's submit button and wait for its result; clicks again if the page was not ready yet. */
async function submit(page, d, button, result, tries = 3, before) {
  for (let i = 0; i < tries; i++) {
    if (before) await before();
    await d.click(button);
    const ok = await d.until(() => result.first().waitFor({ timeout: 12_000 }).then(() => true).catch(() => false));
    if (ok) return;
    await page.waitForTimeout(1500);
  }
  throw new Error('No result after submitting');
}

/** Pick an option by its text and make sure it stuck (client forms can reset while loading). */
async function pick(page, d, select, re) {
  await d.point(select, 0.3);
  for (let i = 0; i < 5; i++) {
    const v = await select.evaluate((el, src) => [...el.options].find((o) => new RegExp(src).test(o.text))?.value, re.source);
    if (!v) throw new Error(`No option matching ${re}`);
    await select.selectOption(v);
    await page.waitForTimeout(700);
    if ((await select.inputValue()) === v) return;
  }
  throw new Error(`Could not select ${re}`);
}

export const chapters = [
  {
    title: 'The dashboard', sub: 'Everything at a glance',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/admin`);
      d.step('Overview', 'Registrations and what needs attention', { say: 'The overview shows open registrations, how many seats are filled, and anything that needs your attention.', wide: true });
      await d.point(page.locator('.ad-stats'));
      await d.wait(2500);
    },
  },
  {
    title: 'Create an event', sub: 'Details, poster, QR tickets, publish',
    async run({ page, d }) {
      const t = nextEventTimes();
      await d.click(side(page, 'Courses and events'), { nav: true });
      d.step('New event', 'Courses and events, then New event', { say: 'To add an event, open Courses and events, and press New event.' });
      await d.click(page.getByRole('link', { name: '+ New event' }), { nav: true });
      d.step('The details', 'Title, summary, speaker, date and venue', { say: 'Give it a title, a short summary, the speaker, the date, and the venue.' });
      await page.locator('select[name="type_id"]').selectOption({ label: 'Seminar' }).catch(() => {});
      await d.type(page.locator('input[name="title"]'), 'Raising Children in a Digital Age');
      await page.locator('input[name="slug"]').fill(`demo-raising-children-${RUN}`);
      await page.locator('input[name="subtitle"]').fill('Feel Good Fridays');
      await page.locator('textarea[name="summary"]').fill('Practical guidance for parents on screens, friendships and faith at home.');
      await page.locator('textarea[name="description"]').fill('An evening for parents on raising confident Muslim children online.\n\nQ&A at the end. Tea served.');
      await d.fill(page.locator('input[name="speaker"]'), 'Mufti Abdul Wahab');
      await d.fill(page.locator('input[name="starts_at"]'), t.start);
      await page.locator('input[name="ends_at"]').fill(t.end);
      d.step('Poster, seats and QR tickets', 'QR tickets let volunteers check people in', { say: 'Upload the poster, set the number of seats, and turn on QR tickets for big events.' });
      await d.upload(page.locator('input[name="poster"]'), POSTER);
      await d.fill(page.locator('input[name="capacity"]'), '300');
      await d.check(page.locator('input[name="qr_tickets_enabled"]'));
      d.step('Publish', 'Live on the website straight away', { say: "Press Publish, and it's live on the website straight away." });
      await d.click(page.getByRole('button', { name: 'Publish', exact: true }));
      await d.until(() => page.waitForURL(/\/admin\/offerings\/[0-9a-f-]{36}/, { timeout: 60_000 }));
      await settle(page); await d.wait(800);
    },
  },
  {
    title: 'Registration forms', sub: 'Pick questions or write new ones',
    async run({ page, d }) {
      await d.click(page.locator('.ad-tabs').getByRole('link', { name: 'Registration form' }), { nav: true });
      d.step('The registration form', '"From profile" questions fill themselves in', { say: 'Every event has its own form. Questions marked From profile fill themselves in from the person\'s account.', wide: true });
      await d.point(page.locator('.ad-card').first(), 0.5, 0.3);
      await d.wait(1500);
      d.step('Add a question', 'From the library, or write a new one', { say: "Add a question from the library, or write a new one. New questions are saved for future forms too." });
      await d.type(page.locator('input[name="label"]'), 'Will you attend in person?');
      await page.locator('select[name="type"]').selectOption('single_select');
      await page.locator('textarea[name="options"]').fill('Yes, at Main Campus\nI will watch the live stream');
      await d.click(page.getByRole('button', { name: 'Create and add to this form' }));
      await d.until(() => settle(page)); await d.wait(1200);
    },
  },
  {
    title: 'Create a course', sub: 'Fee, intake and outline',
    async run({ page, d }) {
      await d.click(side(page, 'Courses and events'), { nav: true });
      await d.click(page.getByRole('link', { name: 'New course', exact: true }), { nav: true });
      d.step('Courses', 'Same editor, plus fee, intake and outline', { say: 'Courses work the same way, with extra details like the fee, the next intake, and the course outline.' });
      await page.locator('input[name="title"]').fill('Seerah Intensive');
      await page.locator('input[name="slug"]').fill(`demo-seerah-intensive-${RUN}`);
      await page.locator('input[name="subtitle"]').fill('6 months');
      await page.locator('textarea[name="summary"]').fill('The life of the Prophet ﷺ from Makkah to Madinah, in six months of weekend classes.');
      await page.locator('input[name="code"]').fill('SI-01');
      await page.locator('input[name="duration_label"]').fill('6 months');
      await d.type(page.locator('input[name="fee_text"]'), 'Rs 3,000 per month');
      await d.fill(page.locator('input[name="intake_label"]'), 'January 2027');
      await d.fill(page.locator('textarea[name="outline"]'), 'Months 1 to 2 | Makkah: early life and revelation\nMonths 3 to 4 | Hijrah and building Madinah\nMonths 5 to 6 | Treaties and the final sermon');
      d.step('Save as a draft', 'Publish when it is ready', { say: "Save it as a draft, and publish it when it's ready." });
      await d.click(page.getByRole('button', { name: 'Save draft' }));
      await d.until(() => page.waitForURL(/\/admin\/offerings\/[0-9a-f-]{36}/, { timeout: 60_000 }));
      await settle(page); await d.wait(800);
    },
  },
  {
    title: 'Applications', sub: 'Review, update, export',
    async run({ page, d }) {
      await d.click(side(page, 'Courses and events'), { nav: true });
      await d.click(page.locator('tr', { hasText: 'Darse Nizami' }).locator('a[href$="/responses"]'), { nav: true });
      d.step('Applications', 'Everyone who applied, by status', { say: 'Every application lands here, with counts by status, and you can export it all to Excel.', wide: true });
      await d.point(page.getByRole('link', { name: /Export to Excel/ }));
      await d.wait(1000);
      d.step('Update many at once', 'Tick, choose a status, Apply', { say: 'Tick a few people, choose a status, and apply it to all of them at once.' });
      const boxes = page.locator('input[name="ids"]');
      await d.check(boxes.nth(0)); await d.check(boxes.nth(1));
      await page.locator('.ad-bulk select[name="status"]').selectOption('confirmed');
      await d.click(page.locator('.ad-bulk').getByRole('button', { name: 'Apply' }), { nav: true });
      d.step('One person in full', 'Details, answers and a private note', { say: 'Open anyone to see their full details, and leave a private note for the team.' });
      await d.click(page.locator('.ad-table tbody a').first(), { nav: true });
      await d.type(page.locator('textarea[name="admin_notes"]'), 'Interview booked for Saturday.');
      await d.click(page.getByRole('button', { name: 'Save note' }), { nav: true });
    },
  },
  {
    title: 'Door check-in', sub: 'On a volunteer\'s phone',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/admin/check-in`);
      const link = page.getByRole('link', { name: /Enslaved/ }).first();
      const href = await link.getAttribute('href');
      await page.evaluate((src) => {
        document.body.innerHTML = '';
        document.body.style.cssText = 'margin:0;height:100vh;display:flex;align-items:center;justify-content:center;gap:56px;background:linear-gradient(135deg,#0B1B33,#16345E);font-family:system-ui,sans-serif';
        document.body.insertAdjacentHTML('beforeend', `
          <div style="color:#fff;max-width:420px"><div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#7FB2E8;font-weight:700">On a volunteer's phone</div>
          <div style="font-size:36px;font-weight:800;margin-top:10px;line-height:1.15">Check people in at the door</div>
          <div style="font-size:17px;color:#C9D7EA;margin-top:12px;line-height:1.5">Scan the QR ticket with the phone camera, or search by ticket code, name or phone.</div></div>
          <div style="width:330px;height:660px;border-radius:42px;background:#05080F;padding:11px;box-shadow:0 24px 60px rgba(0,0,0,.45)">
            <iframe id="phone" src="${src}" style="width:100%;height:100%;border:0;border-radius:32px;background:#fff"></iframe></div>`);
      }, href);
      const f = page.frameLocator('#phone');
      const search = f.locator('input[aria-label="Search"]');
      await search.waitFor({ timeout: 30_000 });
      d.step('Door check-in', 'Volunteers only ever see this screen', { say: 'On event day, volunteers open Door check-in on their phone. It\'s the only screen they can see.', wide: true });
      await d.wait(1500);
      await search.press('Enter');
      await f.locator('.ci-result').first().waitFor({ timeout: 20_000 });
      const names = await f.locator('.ci-result:has(button:not([disabled])) strong').allTextContents();
      const name = names.find((n) => !/Abdullah Khan/.test(n)) ?? names[0] ?? '';
      d.step('Scan or search, then check in', 'The counter updates for everyone', { say: 'They scan the ticket, or search by name or phone, and tap Check in. The counter updates for everyone at the door.' });
      await d.type(search, name);
      await search.press('Enter');
      await d.wait(1200);
      await d.click(f.locator('.ci-result:has(button:not([disabled]))', { hasText: name }).first().getByRole('button', { name: 'Check in' }));
      await d.wait(1800);
    },
  },
  {
    title: 'Feedback', sub: 'Results, questions, send',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/admin/offerings?status=past`);
      await d.click(page.getByRole('link', { name: 'Our Parents in Old Age' }).first(), { nav: true });
      await d.click(page.locator('.ad-tabs').getByRole('link', { name: 'Feedback' }), { nav: true });
      d.step('Feedback results', 'Ratings, charts and comments', { say: 'After an event, the Feedback tab shows the ratings, charts, and every comment.', wide: true });
      await d.point(page.locator('.ad-card').first(), 0.5, 0.3);
      await d.wait(2000);
      d.step('Send the feedback form', 'To everyone, or only those who have not answered', { say: "Adjust the questions if you like, then send the form to everyone who hasn't answered yet." });
      await page.waitForTimeout(1500);
      await d.check(page.locator('input[name="audience"][value="missing"]'));
      await submit(page, d, page.getByRole('button', { name: /Send feedback form to/ }), page.locator('.ad-alert--ok, .ad-alert--err'));
      await d.point(page.locator('.ad-alert').last());
      await d.wait(1200);
    },
  },
  {
    title: 'Requests', sub: 'Hifz, Mentorship, Hikmah at Work',
    async run({ page, d }) {
      await d.click(side(page, 'Requests'), { nav: true });
      d.step('Requests', 'From the Hifz, Mentorship and Hikmah at Work pages', { say: 'Hifz, Mentorship and Hikmah at Work submissions all arrive in Requests, and you get an email for each one.', wide: true });
      await d.wait(1200);
      await d.click(page.getByRole('link', { name: 'Kamran Siddiqui' }), { nav: true });
      d.step('Follow up', 'Set the status and keep notes', { say: 'Open one to see everything, like each child in a Hifz registration, then set its status and keep notes.' });
      await d.point(page.locator('aside.ad-card'), 0.5, 0.25);
      await d.wait(1200);
      await page.locator('aside select[name="status"]').selectOption('in_progress');
      await d.type(page.locator('aside textarea[name="admin_notes"]'), 'Assessment booked for Monday.');
      await d.click(page.locator('aside').getByRole('button', { name: 'Save' }), { nav: true });
    },
  },
  {
    title: 'The homepage', sub: 'Change the website yourself',
    async run({ page, d }) {
      await d.click(side(page, 'Homepage'), { nav: true });
      d.step('Homepage', 'Text, stats, testimonials, sections', { say: "The Homepage page lets you change the website's text, stats and sections, without a developer.", wide: true });
      const stat = page.locator('input[aria-label="Stat 1 number"]');
      const val = (await stat.inputValue()) || '350';
      await d.type(stat, val);
      await d.click(page.getByRole('button', { name: 'Save and publish' }));
      await d.until(() => settle(page)); await d.wait(800);
    },
  },
  {
    title: 'Find and invite people', sub: 'Target a group, invite them',
    async run({ page, d }) {
      await d.click(side(page, 'People'), { nav: true });
      d.step('People', 'Everyone with an account', { say: "People shows everyone with an account. Let's invite our Feel Good Friday regulars to the next one.", wide: true });
      await d.wait(1200);
      d.step('Filter', 'Came 2+ times, lives in Gulshan', { say: 'Filter for people who came to Feel Good Fridays at least twice, and live in Gulshan.' });
      await page.locator('select[name="em"]').selectOption('registered');
      await d.type(page.locator('input[name="es"]'), 'Feel Good Fridays');
      await d.fill(page.locator('input[name="min"]'), '2');
      await d.type(page.locator('input[name="area"]'), 'Gulshan');
      await d.click(page.getByRole('button', { name: 'Show people' }), { nav: true });
      await d.scrollTop();
      await d.point(page.locator('.ad-stat').first());
      d.step('Leave out', 'Anyone already registered', { say: 'Leave out anyone who has already registered for it.' });
      await pick(page, d, page.locator('select[name="x"]'), /Economics of Time/);
      await d.click(page.getByRole('button', { name: 'Show people' }), { nav: true });
      await d.scrollTop();
      d.step('Save and invite', 'Only people who opted in receive it', { say: 'Save it as a group, add a short note, and send the invite. Only people who opted in to emails receive it.' });
      await d.type(page.locator('input[name="name"]'), 'FGF regulars, Gulshan');
      await d.click(page.getByRole('button', { name: 'Save group' }), { nav: true });
      await page.waitForURL(/seg=/, { timeout: 30_000 }).catch(() => {});
      await settle(page); await page.waitForTimeout(2500);
      const inviteTo = page.locator('select[name="offering_id"]');
      await pick(page, d, inviteTo, /Economics of Time/);
      await d.type(page.locator('textarea[name="message"]'), 'We saved you a seat for this one. See you there, in sha Allah!');
      await d.check(page.locator('input[name="confirm"]'));
      await submit(page, d, page.getByRole('button', { name: 'Send invite' }), page.locator('.ad-alert--ok, .ad-alert--err'), 3, async () => {
        if (!(await inviteTo.inputValue())) await pick(page, d, inviteTo, /Economics of Time/);
        if (!(await page.locator('input[name="confirm"]').isChecked())) await d.check(page.locator('input[name="confirm"]'));
      });
      await d.point(page.locator('.ad-alert').first());
      await d.wait(1200);
      d.step('Full history', 'Registrations, check-ins, feedback, invites', { say: 'Click anyone to see their full history: registrations, check-ins, feedback and invites.' });
      await d.click(page.locator('.ad-table tbody a').first(), { nav: true });
      await d.point(page.locator('.ad-stats'));
      await d.wait(1500);
    },
  },
  {
    title: 'Give someone access', sub: 'Volunteers, admins, super admins',
    async run({ page, d }) {
      await d.click(side(page, 'Admins'), { nav: true });
      d.step('Admins', 'Give access by email', { say: 'Finally, Admins. Give someone access by email. Volunteers only see door check-in.' });
      await d.type(page.locator('input[name="email"][type="email"]'), d.email('hk.hamza.qureshi'));
      await page.locator('select[name="role"]').selectOption('volunteer');
      await submit(page, d, page.getByRole('button', { name: 'Give access' }), page.locator('.ad-alert'));
      await settle(page);
      await d.point(page.locator('.ad-table'));
      await d.wait(1500);
    },
  },
];
