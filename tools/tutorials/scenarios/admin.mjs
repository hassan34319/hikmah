// Full admin walkthrough. Needs supabase/demo/demo-seed.sql loaded (with your inbox).
// Everything created here uses demo- page links or +hk. emails, so demo-cleanup.sql removes it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POSTER = path.join(ROOT, 'apps/web/public/seed/event-striving-in-deen.jpg');

/** Friday about three weeks out, as datetime-local strings in Karachi time. */
function nextEventTimes() {
  const d = new Date(Date.now() + 5 * 3600_000); // Karachi clock
  d.setUTCDate(d.getUTCDate() + 21 + ((5 - d.getUTCDay() + 7) % 7));
  const day = d.toISOString().slice(0, 10);
  return { start: `${day}T19:30`, end: `${day}T21:30` };
}

const side = (page, label) => page.locator('.ad-side').getByRole('link', { name: label, exact: true });
const saved = (page) => page.waitForLoadState('networkidle');

export const chapters = [
  {
    title: 'The dashboard', sub: 'Everything at a glance when you sign in',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/admin`);
      d.step('Overview', 'Open registrations, seats filled and what needs attention');
      await d.zoom(page.locator('.ad-stats'), 3, 1.4);
      await d.wait(3200);
      await d.scrollBy(500);
      await d.wait(2500);
      await d.scrollTop();
      await d.point(page.locator('.ad-side nav'), 0.5, 0.4);
      d.step('The menu', 'Every admin tool lives in the sidebar');
      await d.wait(2500);
    },
  },
  {
    title: 'Create an event', sub: 'Details, poster, seats, QR tickets, publish',
    async run({ page, d, BASE }) {
      const t = nextEventTimes();
      await d.click(side(page, 'Courses and events'), { nav: true });
      d.step('Courses and events', 'Every course and event, with registrations so far');
      await d.wait(2000);
      await d.click(page.getByRole('link', { name: '+ New event' }), { nav: true });
      d.step('Step 1: The basics', 'Type, title, a short summary and the speaker');
      await d.select(page.locator('select[name="type_id"]'), /Seminar/);
      await d.type(page.locator('input[name="title"]'), 'Raising Children in a Digital Age');
      await d.fill(page.locator('input[name="slug"]'), 'demo-raising-children-digital-age');
      await d.type(page.locator('input[name="subtitle"]'), 'Feel Good Fridays');
      await d.fill(page.locator('textarea[name="summary"]'), 'Practical guidance for parents on screens, friendships and faith at home.');
      await d.fill(page.locator('textarea[name="description"]'), 'An evening for parents on raising confident Muslim children online: setting screen limits that stick, talking about what they see, and building habits of faith at home.\n\nQ&A at the end. Tea served.');
      await d.type(page.locator('input[name="speaker"]'), 'Mufti Abdul Wahab');
      d.step('Step 2: Date and venue', 'All times are Karachi time');
      await d.fill(page.locator('input[name="starts_at"]'), t.start);
      await d.fill(page.locator('input[name="ends_at"]'), t.end);
      await d.select(page.locator('select[name="venue"]'), /Main Campus/);
      d.step('Step 3: Poster', 'Upload the event poster, it shows on the website and in emails');
      await d.upload(page.locator('input[name="poster"]'), POSTER);
      await d.wait(1200);
      d.step('Step 4: Seats and QR tickets', 'Turn on QR tickets for big events so volunteers can check people in');
      await d.fill(page.locator('input[name="capacity"]'), '300');
      await d.check(page.locator('input[name="qr_tickets_enabled"]'));
      await d.zoom(page.locator('input[name="qr_tickets_enabled"]').locator('xpath=ancestor::section[1]'), 3, 1.5);
      await d.wait(2500);
      d.step('Step 5: Publish', 'It goes live on the website straight away');
      await d.click(page.getByRole('button', { name: 'Publish', exact: true }));
      await page.waitForURL(/\/admin\/offerings\/[0-9a-f-]{36}/, { timeout: 60_000 });
      await saved(page);
      await d.wait(2500);
    },
  },
  {
    title: 'Build the registration form', sub: 'Pick questions, write new ones, reorder',
    async run({ page, d, BASE }) {
      if (!/\/admin\/offerings\/[0-9a-f-]{36}/.test(page.url())) {
        await d.goto(`${BASE}/admin/offerings`);
        await d.click(page.getByRole('link', { name: 'Raising Children in a Digital Age' }).first(), { nav: true });
      }
      await d.click(page.locator('.ad-tabs').getByRole('link', { name: 'Registration form' }), { nav: true });
      d.step('The registration form', '"From profile" questions fill in by themselves from the person\'s account');
      await d.zoom(page.locator('.ad-card').first(), 3, 1.3);
      await d.wait(3000);
      d.step('Add from the question library', 'Reuse questions you have asked before');
      const lib = page.locator('select[name="field_id"]');
      await d.select(lib, /Area|How did you hear|Occupation|Gender|Date of birth/);
      await d.click(page.getByRole('button', { name: 'Add question' }));
      await saved(page); await d.wait(1500);
      d.step('Or write a new question', 'Short answer, paragraph, choose one, choose several, yes or no and more');
      await d.type(page.locator('input[name="label"]'), 'Will you attend in person?');
      await d.select(page.locator('select[name="type"]'), 'single_select');
      await d.fill(page.locator('textarea[name="options"]'), 'Yes, at Main Campus\nI will watch the live stream');
      await d.click(page.getByRole('button', { name: 'Create and add to this form' }));
      await saved(page); await d.wait(1800);
      d.step('Reorder or make optional', 'Use the arrows, Make optional, or Remove');
      await d.click(page.getByRole('button', { name: 'Move up' }).last());
      await saved(page); await d.wait(2500);
    },
  },
  {
    title: 'Create a course', sub: 'Fee, duration, class times and outline',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/admin/offerings`);
      await d.click(page.getByRole('link', { name: 'New course', exact: true }), { nav: true });
      d.step('Course basics', 'Same editor as events, plus course details');
      await d.type(page.locator('input[name="title"]'), 'Seerah Intensive');
      await d.fill(page.locator('input[name="slug"]'), 'demo-seerah-intensive');
      await d.type(page.locator('input[name="subtitle"]'), '6 months');
      await d.fill(page.locator('textarea[name="summary"]'), 'The life of the Prophet ﷺ from Makkah to Madinah, in six months of weekend classes.');
      d.step('Course details', 'Code, duration, fee, next intake and who it is for');
      await d.fill(page.locator('input[name="code"]'), 'SI-01');
      await d.fill(page.locator('input[name="duration_label"]'), '6 months');
      await d.fill(page.locator('input[name="duration_months"]'), '6');
      await d.type(page.locator('input[name="fee_text"]'), 'Rs 3,000 per month');
      await d.fill(page.locator('input[name="intake_label"]'), 'January 2027');
      await d.fill(page.locator('input[name="level"]'), 'Beginner');
      await d.fill(page.locator('input[name="eligibility"]'), 'Anyone 16 or older. No prior study needed.');
      await d.fill(page.locator('textarea[name="schedule_text"]'), 'Saturdays 10 am to 12 pm, Main Campus\nSundays 10 am to 12 pm, DHA Campus');
      d.step('Course outline', 'One line per part: title | topics');
      await d.fill(page.locator('textarea[name="outline"]'), 'Months 1 to 2 | Makkah: early life and revelation\nMonths 3 to 4 | Hijrah and building Madinah\nMonths 5 to 6 | Battles, treaties and the final sermon');
      await d.zoom(page.locator('textarea[name="outline"]'), 3, 1.6);
      await d.wait(2000);
      d.step('Save as draft', 'Keep it hidden until it is ready, then press Publish');
      await d.click(page.getByRole('button', { name: 'Save draft' }));
      await page.waitForURL(/\/admin\/offerings\/[0-9a-f-]{36}/, { timeout: 60_000 });
      await saved(page); await d.wait(2500);
    },
  },
  {
    title: 'The question library', sub: 'Questions you can reuse on any form',
    async run({ page, d }) {
      await d.click(side(page, 'Question library'), { nav: true });
      d.step('Question library', 'Write a question once, add it to any form later');
      await d.wait(2000);
      await d.type(page.locator('input[name="label"]'), 'Which campus is closer to you?');
      await d.select(page.locator('select[name="type"]'), 'single_select');
      await d.fill(page.locator('textarea[name="options"]'), 'Main Campus\nDHA Campus');
      await d.click(page.getByRole('button', { name: 'Create question' }));
      await saved(page); await d.wait(2500);
    },
  },
  {
    title: 'Applications and responses', sub: 'Review, change status, add notes, export',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/admin/offerings`);
      await d.click(page.locator('tr', { hasText: 'Darse Nizami' }).locator('a[href$="/responses"]'), { nav: true });
      d.step('Applications', 'Everyone who applied, with counts by status');
      await d.zoom(page.locator('.ad-stats'), 2.5, 1.4);
      await d.wait(2500);
      d.step('Change many at once', 'Tick people, choose a status, press Apply');
      const boxes = page.locator('input[name="ids"]');
      await d.check(boxes.nth(0)); await d.check(boxes.nth(1));
      await d.select(page.locator('.ad-bulk select[name="status"]'), 'confirmed');
      await d.click(page.locator('.ad-bulk').getByRole('button', { name: 'Apply' }), { nav: true });
      await d.wait(2000);
      d.step('See one person in full', 'Their profile, answers and a private admin note');
      await d.click(page.locator('.ad-table tbody a').first(), { nav: true });
      await d.zoom(page.locator('aside.ad-card'), 3, 1.4);
      await d.wait(1500);
      await d.type(page.locator('textarea[name="admin_notes"]'), 'Called on WhatsApp, interview booked for Saturday.');
      await d.click(page.getByRole('button', { name: 'Save note' }), { nav: true });
      await d.wait(1500);
      d.step('Export to Excel', 'One click, every answer in its own column');
      const dl = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
      await d.click(page.getByRole('link', { name: /Export to Excel/ }));
      await dl; await d.wait(2000);
    },
  },
  {
    title: 'Door check-in on event day', sub: 'Volunteers use this on their phone',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/admin/check-in`);
      d.step('Door check-in', 'Pick today\'s event. Volunteers only ever see this screen');
      await d.wait(1800);
      const link = page.getByRole('link', { name: /Enslaved/ }).first();
      const href = await link.getAttribute('href');
      await d.point(link); await d.wait(600);
      // Show the phone screen in a frame, the way volunteers see it.
      await page.evaluate((src) => {
        document.body.innerHTML = '';
        document.body.style.cssText = 'margin:0;height:100vh;display:flex;align-items:center;justify-content:center;gap:80px;background:linear-gradient(135deg,#0B1B33,#16345E);font-family:system-ui,sans-serif';
        document.body.insertAdjacentHTML('beforeend', `
          <div style="color:#fff;max-width:520px"><div style="font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:#7FB2E8;font-weight:700">On a volunteer's phone</div>
          <div style="font-size:44px;font-weight:800;margin-top:12px;line-height:1.15">Check people in at the door</div>
          <div style="font-size:20px;color:#C9D7EA;margin-top:16px;line-height:1.5">Tap Scan to read the QR ticket with the phone camera, or search by ticket code, name or phone number.</div></div>
          <div style="width:410px;height:860px;border-radius:52px;background:#05080F;padding:14px;box-shadow:0 30px 80px rgba(0,0,0,.45)">
            <iframe id="phone" src="${src}" style="width:100%;height:100%;border:0;border-radius:40px;background:#fff"></iframe></div>`);
      }, href);
      const f = page.frameLocator('#phone');
      await f.locator('input[aria-label="Search"]').waitFor({ timeout: 30_000 });
      await d.wait(1500);
      d.step('Find someone', 'By ticket code, name or phone, even "0300..." works');
      await f.locator('input[aria-label="Search"]').press('Enter');
      await f.locator('.ci-result').first().waitFor({ timeout: 20_000 });
      const name = (await f.locator('.ci-result:has(button:not([disabled])) strong').first().textContent()) ?? '';
      await d.type(f.locator('input[aria-label="Search"]'), name.split(' ')[0]);
      await f.locator('input[aria-label="Search"]').press('Enter');
      await d.wait(1800);
      d.step('Mark them arrived', 'The counter at the top updates for everyone at the door');
      await d.click(f.locator('.ci-result', { hasText: name }).getByRole('button', { name: 'Check in' }));
      await d.wait(2800);
    },
  },
  {
    title: 'Feedback after an event', sub: 'Edit the questions, send, read the results',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/admin/offerings?status=past`);
      await d.click(page.getByRole('link', { name: 'Our Parents in Old Age' }).first(), { nav: true });
      await d.click(page.locator('.ad-tabs').getByRole('link', { name: 'Feedback' }), { nav: true });
      d.step('Feedback results', 'Average ratings, charts and every comment');
      await d.wait(1500);
      await d.zoom(page.locator('.ad-card').first(), 3, 1.3);
      await d.wait(3000);
      d.step('Edit the questions', 'Start from the default form, change it for each event');
      await d.click(page.getByRole('button', { name: '+ Add question' }));
      await d.type(page.locator('input[placeholder="Question"]').last(), 'Which topic should we cover next?');
      await d.click(page.getByRole('button', { name: 'Save questions' }));
      await page.locator('.ad-alert').first().waitFor({ timeout: 20_000 }); await d.wait(1500);
      d.step('Send it', 'To everyone who registered, or only those who have not answered yet');
      await d.check(page.locator('input[name="audience"][value="missing"]'));
      await d.click(page.getByRole('button', { name: /Send feedback form to/ }));
      await page.locator('.ad-alert--ok, .ad-alert--err').last().waitFor({ timeout: 60_000 });
      await d.zoom(page.locator('.ad-alert').last(), 2.5, 1.6);
      await d.wait(2500);
    },
  },
  {
    title: 'Requests', sub: 'Hifz, Mentorship Circle and Hikmah at Work',
    async run({ page, d }) {
      await d.click(side(page, 'Requests'), { nav: true });
      d.step('Requests', 'Forms from the Hifz, Mentorship and Hikmah at Work pages. Each one also emails you');
      await d.wait(2000);
      await d.click(page.getByRole('link', { name: 'Kamran Siddiqui' }), { nav: true });
      d.step('A Hifz registration', 'One parent, several children, all in one place');
      await d.zoom(page.locator('aside.ad-card'), 3.5, 1.4);
      await d.wait(3500);
      d.step('Follow up', 'Set the status and keep a note for the team');
      await d.select(page.locator('aside select[name="status"]'), 'in_progress');
      await d.type(page.locator('aside textarea[name="admin_notes"]'), 'Assessment booked for Monday 10 am.');
      await d.click(page.locator('aside').getByRole('button', { name: 'Save' }), { nav: true });
      await d.wait(1500);
      await d.click(page.locator('.ad-tabs').getByRole('link', { name: /Mentorship/ }), { nav: true });
      await d.wait(1800);
      await d.click(page.locator('.ad-tabs').getByRole('link', { name: /Hikmah at Work/ }), { nav: true });
      await d.wait(1800);
      d.step('Export any list', 'Download to Excel to share with the team');
      const dl = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
      await d.click(page.getByRole('link', { name: /Export to Excel/ }));
      await dl; await d.wait(1500);
    },
  },
  {
    title: 'The homepage', sub: 'Change the website without a developer',
    async run({ page, d, BASE }) {
      await d.click(side(page, 'Homepage'), { nav: true });
      d.step('Homepage manager', 'Hero text and photo, stats, testimonials, talks and contact links');
      await d.wait(2500);
      const stat = page.locator('input[aria-label="Stat 1 number"]');
      const val = (await stat.inputValue()) || '350';
      await d.type(stat, val);
      await d.scrollBy(900);
      await d.wait(1500);
      d.step('Show or hide sections', 'Switch any part of the homepage on or off');
      await d.scrollTop();
      const sw = page.locator('.ad-switch input').first();
      await d.point(sw); await d.wait(1500);
      d.step('Save and publish', 'Changes appear on the website straight away');
      await d.click(page.getByRole('button', { name: 'Save and publish' }));
      await saved(page); await d.wait(1500);
      await d.goto(`${BASE}/`);
      await d.wait(2000); await d.scrollBy(700); await d.wait(1500);
    },
  },
  {
    title: 'Find and invite people', sub: 'Target the right group and invite them to an event',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/admin/people`);
      d.step('People', 'Everyone who has made an account on the website');
      await d.zoom(page.locator('.ad-stats'), 3, 1.5);
      await d.wait(3000);
      d.step('Who attended what', 'Registered for Feel Good Fridays, at least 2 times');
      await d.select(page.locator('select[name="em"]'), 'registered');
      await d.type(page.locator('input[name="es"]'), 'Feel Good Fridays');
      await d.type(page.locator('input[name="min"]'), '2');
      await d.click(page.getByRole('button', { name: 'Show people' }), { nav: true });
      await d.scrollTop();
      await d.zoom(page.locator('.ad-stat').first(), 2.5, 1.8);
      await d.wait(2500);
      d.step('Narrow by area', 'Partial names work: "Gulshan" matches every block');
      await d.type(page.locator('input[name="area"]'), 'Gulshan-e-Iqbal');
      await d.click(page.getByRole('button', { name: 'Show people' }), { nav: true });
      await d.scrollTop();
      await d.zoom(page.locator('.ad-stat').first(), 2.5, 1.8);
      await d.wait(2500);
      d.step('Leave out people already coming', 'Skip anyone registered for the next Feel Good Friday');
      await d.select(page.locator('select[name="x"]'), /Economics of Time/);
      await d.click(page.getByRole('button', { name: 'Show people' }), { nav: true });
      await d.scrollTop();
      await d.zoom(page.locator('.ad-stats'), 2.5, 1.5);
      await d.wait(2500);
      d.step('Save it as a group', 'Groups keep the filters, so new people who match join automatically');
      await d.type(page.locator('input[name="name"]'), 'FGF regulars, Gulshan');
      await d.click(page.getByRole('button', { name: 'Save group' }), { nav: true });
      await d.scrollTop(); await d.wait(2000);
      d.step('Invite the group', 'Only people who opted in to emails receive it');
      await d.select(page.locator('select[name="offering_id"]'), /Economics of Time/);
      await d.type(page.locator('textarea[name="message"]'), 'Since you have joined us for Feel Good Fridays before, we saved you a seat for this one. See you there, in sha Allah!');
      await d.check(page.locator('input[name="confirm"]'));
      await d.click(page.getByRole('button', { name: 'Send invite' }));
      await page.locator('.ad-alert--ok, .ad-alert--err').first().waitFor({ timeout: 60_000 });
      await d.zoom(page.locator('.ad-alert').first(), 3, 1.8);
      await d.wait(3000);
      d.step('Anyone\'s full history', 'Registrations, check-ins, feedback and invites');
      await d.click(page.locator('.ad-table tbody a').first(), { nav: true });
      await d.zoom(page.locator('.ad-stats'), 2.5, 1.5);
      await d.wait(2500);
      await d.click(page.locator('.ad-crumb a'), { nav: true });
      d.step('Export the group', 'Download it as an Excel file');
      const dl = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
      await d.click(page.getByRole('link', { name: /Export to Excel/ }));
      await dl; await d.wait(1500);
    },
  },
  {
    title: 'Give someone access', sub: 'Volunteers, admins and super admins',
    async run({ page, d }) {
      await d.click(side(page, 'Admins'), { nav: true });
      d.step('Admins', 'Volunteers only see door check-in. Admins see everything else');
      await d.wait(2000);
      await d.type(page.locator('input[name="email"]'), d.email('hk.hamza.qureshi'));
      await d.select(page.locator('select[name="role"]'), 'volunteer');
      await d.click(page.getByRole('button', { name: 'Give access' }));
      await page.locator('.ad-alert').first().waitFor({ timeout: 30_000 });
      await saved(page);
      await d.zoom(page.locator('.ad-table'), 3, 1.4);
      await d.wait(3000);
    },
  },
];
