// Student and parent side: browse, sign up, complete profile, register, ticket; then a parent registers two children for Hifz.
// Real emails go to DEMO_INBOX plus-addresses (+hk.student, +hk.parent). Remove them later with demo-cleanup.sql.
export const options = { auth: false };

const chip = (page, name, value) => page.locator(`label:has(input[name="${name}"][value="${value}"])`).first();
const EVENT = /Enslaved/;

export const chapters = [
  {
    title: 'Find an event', sub: 'Browse the website, no account needed',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/`);
      d.step('The Hikmah website', 'Courses, events and programs, open to everyone');
      await d.wait(2500);
      await d.scrollBy(800); await d.wait(1500);
      await d.scrollBy(800); await d.wait(1500);
      await d.scrollTop();
      await d.click(page.locator('header').getByRole('link', { name: 'Events', exact: true }).first(), { nav: true });
      d.step('Events', 'Every upcoming talk, halaqah, workshop and conference');
      await d.wait(2500);
      await d.click(page.getByRole('link', { name: EVENT }).first(), { nav: true });
      d.step('The event page', 'Date, speaker, venue with map, and seats left');
      await d.wait(2000);
      await d.scrollBy(500); await d.wait(2000); await d.scrollTop();
    },
  },
  {
    title: 'Sign up with an email code', sub: 'No password to remember',
    async run({ page, d, BASE }) {
      if (!/\/events\//.test(page.url())) { await d.goto(`${BASE}/events`); await d.click(page.getByRole('link', { name: EVENT }).first(), { nav: true }); }
      await d.click(page.getByRole('link', { name: /^Register/ }).first(), { nav: true });
      d.step('Sign in or sign up', 'Same screen for both. We email a 6-digit code');
      await d.type(page.locator('input[name="email"]'), d.email('hk.student'));
      await d.click(page.getByRole('button', { name: 'Send me a code' }));
      await page.locator('input[name="code"]').waitFor({ timeout: 60_000 }).catch(() => {});
      await d.wait(1200);
      const code = await d.ask(`Check ${d.email('hk.student')} and type the 6-digit code here (or paste the sign-in link):`);
      if (/^https?:\/\//.test(code)) {
        await page.goto(code, { waitUntil: 'networkidle' });
      } else {
        await d.type(page.locator('input[name="code"]'), code.replace(/\D/g, ''));
        await d.click(page.getByRole('button', { name: 'Sign in', exact: true }));
      }
      await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 60_000 });
      await page.waitForLoadState('networkidle');
      await d.wait(1500);
    },
  },
  {
    title: 'Complete your profile', sub: 'Asked once, then every form fills itself in',
    async run({ page, d }) {
      if (!page.url().includes('/complete-profile')) return; // already completed earlier
      d.step('About you', 'Name, gender, WhatsApp number and date of birth');
      await d.type(page.locator('input[name="full_name"]'), 'Abdullah Khan');
      await d.click(chip(page, 'gender', 'male'));
      await d.type(page.locator('input[name="phone"]'), '0300 1234567');
      await d.fill(page.locator('input[name="date_of_birth"]'), '2003-06-15');
      d.step('Studies or work', 'Students add their university, professionals their company');
      await d.click(chip(page, 'occupation_type', 'student'));
      await d.type(page.locator('input[name="university"]'), 'NED University');
      await d.fill(page.locator('input[name="degree"]'), 'BS Computer Science');
      await d.fill(page.locator('input[name="education_year"]'), '3rd year');
      d.step('Where in Karachi, and interests', 'Up to 5 interests, so we can suggest the right events');
      await d.type(page.locator('input[name="area"]'), 'Gulshan-e-Iqbal');
      for (const i of ['Seerah', 'Quran', 'Family and marriage']) await d.click(chip(page, 'interests', i));
      await d.select(page.locator('select[name="heard_from"]'), /Instagram|Friend|.+/);
      d.step('Stay in the loop', 'Tick this to hear about new courses and events by email');
      await d.check(page.locator('input[name="email_opt_in"]'));
      await d.zoom(page.locator('input[name="email_opt_in"]').locator('xpath=..'), 2.5, 1.8);
      await d.wait(1800);
      await d.click(page.getByRole('button', { name: /Save and continue/ }));
      await page.waitForURL((u) => !u.pathname.startsWith('/complete-profile'), { timeout: 60_000 });
      await page.waitForLoadState('networkidle'); await d.wait(1500);
    },
  },
  {
    title: 'Register and get your ticket', sub: 'Confirmation email, QR ticket, add to calendar',
    async run({ page, d }) {
      d.step('Register', 'Your details are already filled in. Answer any extra questions and submit');
      await d.wait(2000);
      const submit = page.locator('form:has(input[name="slug"]) button[type="submit"]');
      await d.click(submit);
      await page.waitForURL(/\/account\/registrations\//, { timeout: 60_000 });
      await page.waitForLoadState('networkidle');
      d.step('You\'re registered', 'Show this QR ticket at the door. It is also in your email');
      await d.wait(1500);
      await d.zoom(page.locator('main'), 3.5, 1.3);
      await d.wait(3500);
      d.step('Add it to your calendar', 'Google Calendar, or download for any calendar app');
      await d.point(page.getByText('Add to Google Calendar').first());
      await d.wait(2000);
      await d.click(page.getByRole('link', { name: 'My registrations' }).first(), { nav: true });
      d.step('My account', 'All your registrations in one place, and your profile');
      await d.wait(3000);
    },
  },
  {
    title: 'Parents: register children for Hifz', sub: 'No account needed, several children in one form',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/hifz`);
      d.step('Hifz Program', 'Parents register their children from this page');
      await d.wait(2000);
      const form = page.locator('form:has(input[name="child_ids"])');
      await d.point(form, 0.5, 0.05);
      d.step('Child 1', 'Track, name, age, school and any Quran studied before');
      await d.click(chip(page, 'c1_track', 'Hifz'));
      await d.type(page.locator('input[name="c1_name"]'), 'Abdul Rahman');
      await d.type(page.locator('input[name="c1_age"]'), '8');
      await d.click(chip(page, 'c1_in_school', 'Yes'));
      await d.fill(page.locator('input[name="c1_school"]'), 'The City School');
      await d.click(chip(page, 'c1_prior_study', 'Yes'));
      await d.select(page.locator('select[name="c1_level"]'), 'Nazra');
      d.step('Add another child', 'Brothers can be registered together');
      await d.click(page.getByRole('button', { name: '+ Add another child' }));
      await d.click(chip(page, 'c2_track', 'Nazra'));
      await d.type(page.locator('input[name="c2_name"]'), 'Yusuf');
      await d.type(page.locator('input[name="c2_age"]'), '7');
      await d.click(chip(page, 'c2_in_school', 'Yes'));
      await d.fill(page.locator('input[name="c2_school"]'), 'The City School');
      await d.click(chip(page, 'c2_prior_study', 'No'));
      d.step('Parents and address', 'We email the parent a receipt and the Hikmah team gets the details');
      await d.type(page.locator('input[name="father_name"]'), 'Kamran Khan');
      await d.type(page.locator('input[name="father_phone"]'), '0321 7654321');
      await d.fill(page.locator('input[name="father_email"]'), d.email('hk.parent'));
      await d.fill(page.locator('input[name="mother_name"]'), 'Saima Kamran');
      await d.fill(page.locator('input[name="address"]'), 'House 12, Block 13-D');
      await d.fill(page.locator('input[name="area"]'), 'Gulshan-e-Iqbal');
      await d.fill(page.locator('input[name="city"]'), 'Karachi');
      await d.click(page.getByRole('button', { name: /Register 2 children/ }));
      await page.getByText('Registration received').waitFor({ timeout: 60_000 });
      await d.zoom(page.getByText('Registration received').locator('xpath=..'), 3, 1.6);
      await d.wait(3000);
    },
  },
];
